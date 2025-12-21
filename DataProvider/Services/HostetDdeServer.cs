using DataProvider.Models;
using DataProvider.Services;
using Microsoft.Extensions.Hosting;
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
        private readonly ConcurrentQueue<DBRecord[]> _dbRecordsQueue = new ConcurrentQueue<DBRecord[]>();

        private DDEInfo.InfoServer _ddeServer;

        public DDEServer(ITradesCacherRepository tradesCacher, IBroadCast broadCast, IEventBus eventBus, ILastTradeCache lastTradeCache)
        {
            _tradesCacher = tradesCacher;
            _broadCast = broadCast;
            _eventBus = eventBus;
            _lastTradeCache = lastTradeCache;
        }

        public Task StartAsync(CancellationToken stoppingToken)
        {
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

            _ddeServer = new DDEInfo.InfoServer("excel");
            _ddeServer.StateChanged += OnDdeServerStateChanged;
            _ddeServer.DataPoked += OnDdeServerDataPoked;
            _ddeServer.Register();

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
            var records = ConvertDdeDataToRecords(dataArgs);
            await ProcessRecordsAsync(records);
        }

        private async Task<bool> ShouldEnqueueAsync(int tickerId, long number)
        {
            var lastNumber = await _lastTradeCache.GetLastTradeNumberAsync(tickerId);
            if (number > lastNumber)
            {
                await _lastTradeCache.UpdateLastTradeNumberAsync(tickerId, number);
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
        }
    }
}
