using DataProvider.Models;
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
        private readonly ConcurrentQueue<DBRecord[]> _dbRecordsQueue = new ConcurrentQueue<DBRecord[]>();

        private DDEInfo.InfoServer _ddeServer;

        public DDEServer(ITradesCacherRepository tradesCacher, IBroadCast broadCast, IEventBus eventBus)
        {
            _tradesCacher = tradesCacher;
            _broadCast = broadCast;
            _eventBus = eventBus;
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

        private void ProcessRecords(DBRecord[] records)
        {
            foreach (var record in records)
            {
                var ticker = SQLHelper.TickerDic.TryGetValue(record.ticker, out var foundTicker) ? foundTicker : null;

                _tradesCacher.PushTrade(record.ticker, new Trade(record));

                if (ticker == null || LastIdsContainer.GetLastId(ticker.id) < record.number)
                {
                    HostetDBWriterService.Enqueue(0, record);

                    if (ticker != null)
                        LastIdsContainer.UpdateLastId(ticker.id, record.number);
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

        private void OnDdeServerDataPoked(object sender, DDEInfo.DataPokedEventArgs dataArgs)
        {
            var records = ConvertDdeDataToRecords(dataArgs);
            ProcessRecords(records);
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
