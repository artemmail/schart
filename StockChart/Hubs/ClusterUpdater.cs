using StockChart.EventBus.Models;
using SignalRMvc.Hubs;
using StockChart.Repository;

namespace StockChart.Hubs
{
    public class ClusterUpdater
    {
        ICandlesRepository _candlesRepository;
        HashSet<string> Connections = new HashSet<string>();
        CandlesHub _hub;

        IServiceProvider serviceProvider;
        ILogger<CandlesUpdater> _logger;
        public ClusterUpdater(
            IServiceProvider serviceProvider,
            ILogger<CandlesUpdater> _logger,
            CandlesHub hub,
            IStockMarketServiceRepository stockMarketServiceRepository,
            SubsCluster key)
        {
            this._logger = _logger;
            this.serviceProvider = serviceProvider;
            _hub = hub;
            this.key = key.ToString();
            realTicker = key.ticker;
            stockMarketServiceRepository.UpdateAlias(ref realTicker);
            key.ticker = realTicker;

        }
        string realTicker;
        public string key;

        public async Task AddConnection(string con)
        {
            await _hub.Groups.AddToGroupAsync(con, key.ToString());
            Connections.Add(con);
            //   _logger.LogTrace($"connect {key.ToString()} {Connections.Count}");
        }
        public async Task RemoveConnectionAsync(string con)
        {
            await _hub.Groups.RemoveFromGroupAsync(con, key.ToString());
            if (Connections.Contains(con))
                Connections.Remove(con);
            // _logger.LogTrace($"disconnect {key.ToString()} {Connections.Count}");
        }
        public bool Any()
        {
            return Connections.Any();
        }



    }
}
