using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using StockChart.EventBus.Models;
using StockChart.Hubs;
using StockChart.Repository;
using System.Collections.Concurrent;

namespace SignalRMvc.Hubs
{
    public class CandlesHub : Hub
    {
        // Используем потокобезопасные коллекции
        public static readonly ConcurrentDictionary<SubsCandle, CandlesUpdater> CandlesUpd = new();
        public static readonly ConcurrentDictionary<SubsCluster, ClusterUpdater> ClustersUpd = new();
        public static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> Ladders = new();
        public static readonly ConcurrentDictionary<string, int> LaddersHash = new(); // Восстановили переменную

        private const string SettingsPath = "c:/lua/list.txt"; // Рекомендуется получать из конфигурации

        private readonly ITickersRepository _tickersRepository;
        private readonly ILogger<CandlesUpdater> _logger;
        private readonly IServiceProvider _serviceProvider;

        public CandlesHub(
            ILogger<CandlesUpdater> logger,
            ITickersRepository tickersRepository,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _tickersRepository = tickersRepository;
            _serviceProvider = serviceProvider;
        }

        private async Task UpdateLadderAsync()
        {
            try
            {
                var ladderList = Ladders
                    .Where(x => x.Value.Any() && _tickersRepository[x.Key].ClassName != null)
                    .Select(x => $"{_tickersRepository[x.Key].ClassName}/{_tickersRepository[x.Key].Securityid}")
                    .ToList();

                await System.IO.File.WriteAllLinesAsync(SettingsPath, ladderList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating ladder");
            }
        }

        public async Task SubscribeLadder(string ticker)
        {
            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();

            stockMarketService.UpdateAlias(ref ticker);
            if (string.IsNullOrEmpty(ticker)) return;

            var connections = Ladders.GetOrAdd(ticker, _ => new ConcurrentDictionary<string, byte>());
            connections[Context.ConnectionId] = 0;

            await Groups.AddToGroupAsync(Context.ConnectionId, ticker);
            await UpdateLadderAsync();
        }

        public async Task UnSubscribeLadder(string ticker)
        {
            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();

            stockMarketService.UpdateAlias(ref ticker);
            if (string.IsNullOrEmpty(ticker)) return;

            if (Ladders.TryGetValue(ticker, out var connections))
            {
                connections.TryRemove(Context.ConnectionId, out _);
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, ticker);

                if (connections.IsEmpty)
                    Ladders.TryRemove(ticker, out _);

                await UpdateLadderAsync();
            }
        }

        public async Task SubscribeCandle(string subsCandle)
        {
            var subscription = JsonConvert.DeserializeObject<SubsCandle>(subsCandle);
            if (subscription == null) return;

            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();
            var candlesRepository = scope.ServiceProvider.GetRequiredService<ICandlesRepository>();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            // Решение ошибки CS0206
            string tickerKey = subscription.ticker;
            stockMarketService.UpdateAlias(ref tickerKey);
            subscription.ticker = tickerKey;

            if (subscription.period.HasValue)
            {
                var updater = CandlesUpd.GetOrAdd(subscription, key =>
                    new CandlesUpdater(_serviceProvider, _logger, this, candlesRepository, stockMarketService, _tickersRepository, key));

                await updater.AddConnection(Context.ConnectionId);
            }

            await subscribeRepository.Subscribe(CandlesUpd.Keys.ToArray());
        }

        public async Task UnSubscribeCandle(string subsCandle)
        {
            var subscription = JsonConvert.DeserializeObject<SubsCandle>(subsCandle);
            if (subscription == null) return;

            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            // Решение ошибки CS0206
            string tickerKey = subscription.ticker;
            stockMarketService.UpdateAlias(ref tickerKey);
            subscription.ticker = tickerKey;

            if (CandlesUpd.TryGetValue(subscription, out var updater))
            {
                await updater.RemoveConnectionAsync(Context.ConnectionId);
                if (!updater.Any())
                {
                    CandlesUpd.TryRemove(subscription, out _);
                }

                await subscribeRepository.Subscribe(CandlesUpd.Keys.ToArray());
            }
        }

        public async Task SubscribeCluster(string subsCluster)
        {
            var subscription = JsonConvert.DeserializeObject<SubsCluster>(subsCluster);
            if (subscription == null) return;

            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            // Решение ошибки CS0206
            string tickerKey = subscription.ticker;
            stockMarketService.UpdateAlias(ref tickerKey);
            subscription.ticker = tickerKey;

            if (subscription.period.HasValue)
            {
                var updater = ClustersUpd.GetOrAdd(subscription, key =>
                    new ClusterUpdater(_serviceProvider, _logger, this, stockMarketService, key));

                await updater.AddConnection(Context.ConnectionId);
            }

            await subscribeRepository.Subscribe(ClustersUpd.Keys.ToArray());
        }

        public async Task UnSubscribeCluster(string subsCluster)
        {
            var subscription = JsonConvert.DeserializeObject<SubsCluster>(subsCluster);
            if (subscription == null) return;

            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            // Решение ошибки CS0206
            string tickerKey = subscription.ticker;
            stockMarketService.UpdateAlias(ref tickerKey);
            subscription.ticker = tickerKey;

            if (ClustersUpd.TryGetValue(subscription, out var updater))
            {
                await updater.RemoveConnectionAsync(Context.ConnectionId);
                if (!updater.Any())
                {
                    ClustersUpd.TryRemove(subscription, out _);
                }

                await subscribeRepository.Subscribe(ClustersUpd.Keys.ToArray());
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            foreach (var updater in CandlesUpd.Values)
            {
                await updater.RemoveConnectionAsync(Context.ConnectionId);
            }

            foreach (var updater in ClustersUpd.Values)
            {
                await updater.RemoveConnectionAsync(Context.ConnectionId);
            }

            CleanUpDictionaries();

            foreach (var ticker in Ladders.Keys)
            {
                if (Ladders.TryGetValue(ticker, out var connections))
                {
                    connections.TryRemove(Context.ConnectionId, out _);
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, ticker);

                    if (connections.IsEmpty)
                        Ladders.TryRemove(ticker, out _);
                }
            }

            using var scope = _serviceProvider.CreateScope();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            await subscribeRepository.Subscribe(CandlesUpd.Keys.ToArray());
            await subscribeRepository.Subscribe(ClustersUpd.Keys.ToArray());

            await base.OnDisconnectedAsync(exception);
        }

        private void CleanUpDictionaries()
        {
            foreach (var key in CandlesUpd.Where(x => !x.Value.Any()).Select(x => x.Key).ToList())
            {
                CandlesUpd.TryRemove(key, out _);
            }

            foreach (var key in ClustersUpd.Where(x => !x.Value.Any()).Select(x => x.Key).ToList())
            {
                ClustersUpd.TryRemove(key, out _);
            }

            foreach (var key in Ladders.Where(x => x.Value.IsEmpty).Select(x => x.Key).ToList())
            {
                Ladders.TryRemove(key, out _);
            }
        }
    }
}
