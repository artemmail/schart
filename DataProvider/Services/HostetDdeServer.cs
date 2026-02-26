using DataProvider.Models;
using DataProvider.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StockChart.EventBus.Abstractions;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace DataProvider
{
    public class DDEServer : IHostedService, IDisposable
    {
        private readonly ITradesCacherRepository _tradesCacher;
        private readonly IBroadCast _broadCast;
        private readonly IEventBus _eventBus;
        private readonly ILastTradeCache _lastTradeCache;
        private readonly ILogger<DDEServer> _logger;
        private readonly ConcurrentQueue<DBRecord[]> _dbRecordsQueue = new ConcurrentQueue<DBRecord[]>();
        private readonly SemaphoreSlim _processGate = new SemaphoreSlim(1, 1);

        private DDEInfo.InfoServer _ddeServer;

        public DDEServer(
            ITradesCacherRepository tradesCacher,
            IBroadCast broadCast,
            IEventBus eventBus,
            ILastTradeCache lastTradeCache,
            ILogger<DDEServer> logger)
        {
            _tradesCacher = tradesCacher;
            _broadCast = broadCast;
            _eventBus = eventBus;
            _lastTradeCache = lastTradeCache;
            _logger = logger;
        }

        public Task StartAsync(CancellationToken stoppingToken)
        {
            _ = Task.Run(() =>
            {
                try
                {
                    Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

                    _ddeServer = new DDEInfo.InfoServer("excel");
                    _ddeServer.StateChanged += OnDdeServerStateChanged;
                    _ddeServer.DataPoked += OnDdeServerDataPoked;
                    _ddeServer.Register();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to start DDE server.");
                }
            }, stoppingToken);

            return Task.CompletedTask;
        }

        private async Task ProcessRecordsAsync(DBRecord[] records)
        {
            var recordsByTicker = records
                .GroupBy(record => record.ticker)
                .Select(group => group.OrderBy(record => record.number));

            foreach (var tickerRecords in recordsByTicker)
            {
                foreach (var record in tickerRecords)
                {
                    var ticker = MarketInfoServiceHolder.TryGetTicker(record.ticker, out var foundTicker) ? foundTicker : null;

                    _tradesCacher.PushTrade(record.ticker, new Trade(record));

                    if (ticker == null || await ShouldEnqueueAsync(ticker.id, record.number))
                    {
                        HostetDBWriterService.Enqueue(0, record);
                    }
                }
            }
        }

        private void OnDdeServerStateChanged(object sender, DDEInfo.StateChangedEventArgs args)
        {
            // Логика обработки изменений состояния сервера DDE (если требуется)
        }

        private DBRecord[] ConvertDdeDataToRecords(DDEInfo.DataPokedEventArgs dataArgs)
        {
            return dataArgs.Cells.Select(cell => new DBRecord(cell)).ToArray();
        }

        private async void OnDdeServerDataPoked(object sender, DDEInfo.DataPokedEventArgs dataArgs)
        {
            var lockTaken = false;
            try
            {
                await _processGate.WaitAsync();
                lockTaken = true;

                var records = ConvertDdeDataToRecords(dataArgs);
                await ProcessRecordsAsync(records);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process DDE data poke.");
            }
            finally
            {
                if (lockTaken)
                    _processGate.Release();
            }
        }

        private async Task<bool> ShouldEnqueueAsync(int tickerId, long number)
        {
            // DDE branch must use MaxTrades only; Trades fallback can skip valid older-in-order records.
            var lastNumber = await _lastTradeCache.GetLastTradeNumberAsync(tickerId, includeTradesFallback: false);
                    if (number > lastNumber)
            {
                _lastTradeCache.UpdateLastTradeNumber(tickerId, number);
                return true;
            }

            return false;
        }
        public Task StopAsync(CancellationToken cancellationToken)
        {
            _ddeServer?.Dispose();
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _ddeServer?.Dispose();
            _processGate.Dispose();
        }
    }
}
