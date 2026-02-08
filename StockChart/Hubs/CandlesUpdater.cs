using Microsoft.AspNetCore.SignalR;
using StockChart.EventBus.Models;
using StockChart.Repository;
using System.Collections.Concurrent;

namespace StockChart.Hubs
{
    public class CandlesUpdater
    {
        private readonly ConcurrentDictionary<string, byte> _connections = new();
        public int ConnectionCount => _connections.Count;

        public string ticker { get; set; }
        public double period { get; set; }
        public string key;

        public CandlesUpdater(
            IStockMarketServiceRepository stockMarketServiceRepository,
            ITickersRepository tickers,
            SubsCandle key)
        {
            ticker = key.ticker;
            period = key.period!.Value;
            this.key = key.ToString();

            var realTicker = ticker;
            stockMarketServiceRepository.UpdateAlias(ref realTicker);
            var tt = tickers[realTicker];
            _ = tt.Id;
            _ = tt.Market ?? 0;
        }

        public async Task AddConnection(string connectionId, IGroupManager groups)
        {
            await groups.AddToGroupAsync(connectionId, key);
            _connections[connectionId] = 0;
        }

        public async Task RemoveConnectionAsync(string connectionId, IGroupManager groups)
        {
            await groups.RemoveFromGroupAsync(connectionId, key);
            _connections.TryRemove(connectionId, out _);
        }

        public bool Any()
        {
            return !_connections.IsEmpty;
        }
    }
}
