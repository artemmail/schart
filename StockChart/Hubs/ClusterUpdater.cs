using Microsoft.AspNetCore.SignalR;
using StockChart.EventBus.Models;
using StockChart.Repository;
using System.Collections.Concurrent;

namespace StockChart.Hubs
{
    public class ClusterUpdater
    {
        private readonly ConcurrentDictionary<string, byte> _connections = new();
        public string key;

        public ClusterUpdater(
            IStockMarketServiceRepository stockMarketServiceRepository,
            SubsCluster key)
        {
            this.key = key.ToString();
            var realTicker = key.ticker;
            stockMarketServiceRepository.UpdateAlias(ref realTicker);
            key.ticker = realTicker;
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
