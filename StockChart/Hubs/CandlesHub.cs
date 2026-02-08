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
        private readonly ILogger<CandlesHub> _logger;
        private readonly IServiceProvider _serviceProvider;

        public CandlesHub(
            ILogger<CandlesHub> logger,
            ITickersRepository tickersRepository,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _tickersRepository = tickersRepository;
            _serviceProvider = serviceProvider;
        }

        private void LogFlow(string source, string message)
        {
            _logger.LogInformation("{Source}: {Message}", source, message);
            SignalRFlowFileLogger.Write(source, message);
        }

        public override async Task OnConnectedAsync()
        {
            LogFlow("StockChart.CandlesHub.OnConnected", $"connectionId={Context.ConnectionId}");
            await base.OnConnectedAsync();
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
                SignalRFlowFileLogger.Write("StockChart.CandlesHub.UpdateLadder.Error", ex.Message);
            }
        }

        public async Task SubscribeLadder(string ticker)
        {
            var originalTicker = ticker;
            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();

            stockMarketService.UpdateAlias(ref ticker);
            if (string.IsNullOrEmpty(ticker)) return;

            var connections = Ladders.GetOrAdd(ticker, _ => new ConcurrentDictionary<string, byte>());
            connections[Context.ConnectionId] = 0;

            await Groups.AddToGroupAsync(Context.ConnectionId, ticker);
            await UpdateLadderAsync();
            LogFlow(
                "StockChart.CandlesHub.SubscribeLadder",
                $"connectionId={Context.ConnectionId}; requested={originalTicker}; normalized={ticker}; ladderConnections={connections.Count}");
        }

        public async Task UnSubscribeLadder(string ticker)
        {
            var originalTicker = ticker;
            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();

            stockMarketService.UpdateAlias(ref ticker);
            if (string.IsNullOrEmpty(ticker)) return;

            if (Ladders.TryGetValue(ticker, out var connections))
            {
                connections.TryRemove(Context.ConnectionId, out _);
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, ticker);

                if (connections.IsEmpty)
                {
                    Ladders.TryRemove(ticker, out _);
                    LaddersHash.TryRemove(ticker, out _);
                }

                await UpdateLadderAsync();
                LogFlow(
                    "StockChart.CandlesHub.UnSubscribeLadder",
                    $"connectionId={Context.ConnectionId}; requested={originalTicker}; normalized={ticker}; ladderConnections={connections.Count}");
            }
        }

        public async Task SubscribeCandle(string subsCandle)
        {
            var subscription = JsonConvert.DeserializeObject<SubsCandle>(subsCandle);
            if (subscription == null) return;
            var requestedKey = subscription.ToString();

            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            // Решение ошибки CS0206
            string tickerKey = subscription.ticker;
            stockMarketService.UpdateAlias(ref tickerKey);
            subscription.ticker = tickerKey;

            if (subscription.period.HasValue)
            {
                var updater = CandlesUpd.GetOrAdd(subscription, key =>
                    new CandlesUpdater(stockMarketService, _tickersRepository, key));

                await updater.AddConnection(Context.ConnectionId, Groups);
                LogFlow(
                    "StockChart.CandlesHub.SubscribeCandle",
                    $"connectionId={Context.ConnectionId}; requested={requestedKey}; normalized={subscription}; group={updater.key}; groupConnections={updater.ConnectionCount}; activeGroups={CandlesUpd.Count}");
            }
            else
            {
                LogFlow(
                    "StockChart.CandlesHub.SubscribeCandle",
                    $"connectionId={Context.ConnectionId}; requested={requestedKey}; status=skipped_period_missing");
            }

            await subscribeRepository.Subscribe(CandlesUpd.Keys.ToArray());
        }

        public async Task UnSubscribeCandle(string subsCandle)
        {
            var subscription = JsonConvert.DeserializeObject<SubsCandle>(subsCandle);
            if (subscription == null) return;
            var requestedKey = subscription.ToString();

            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            // Решение ошибки CS0206
            string tickerKey = subscription.ticker;
            stockMarketService.UpdateAlias(ref tickerKey);
            subscription.ticker = tickerKey;

            if (CandlesUpd.TryGetValue(subscription, out var updater))
            {
                await updater.RemoveConnectionAsync(Context.ConnectionId, Groups);
                if (!updater.Any())
                {
                    CandlesUpd.TryRemove(subscription, out _);
                }

                await subscribeRepository.Subscribe(CandlesUpd.Keys.ToArray());
                LogFlow(
                    "StockChart.CandlesHub.UnSubscribeCandle",
                    $"connectionId={Context.ConnectionId}; requested={requestedKey}; normalized={subscription}; group={updater.key}; groupConnections={updater.ConnectionCount}; activeGroups={CandlesUpd.Count}");
            }
            else
            {
                LogFlow(
                    "StockChart.CandlesHub.UnSubscribeCandle",
                    $"connectionId={Context.ConnectionId}; requested={requestedKey}; normalized={subscription}; status=group_not_found");
            }
        }

        public async Task SubscribeCluster(string subsCluster)
        {
            var subscription = JsonConvert.DeserializeObject<SubsCluster>(subsCluster);
            if (subscription == null) return;
            var requestedKey = subscription.ToString();

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
                    new ClusterUpdater(stockMarketService, key));

                await updater.AddConnection(Context.ConnectionId, Groups);
                LogFlow(
                    "StockChart.CandlesHub.SubscribeCluster",
                    $"connectionId={Context.ConnectionId}; requested={requestedKey}; normalized={subscription}; group={updater.key}; groupConnections={updater.ConnectionCount}; activeGroups={ClustersUpd.Count}");
            }
            else
            {
                LogFlow(
                    "StockChart.CandlesHub.SubscribeCluster",
                    $"connectionId={Context.ConnectionId}; requested={requestedKey}; status=skipped_period_missing");
            }

            await subscribeRepository.Subscribe(ClustersUpd.Keys.ToArray());
        }

        public async Task UnSubscribeCluster(string subsCluster)
        {
            var subscription = JsonConvert.DeserializeObject<SubsCluster>(subsCluster);
            if (subscription == null) return;
            var requestedKey = subscription.ToString();

            using var scope = _serviceProvider.CreateScope();
            var stockMarketService = scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            // Решение ошибки CS0206
            string tickerKey = subscription.ticker;
            stockMarketService.UpdateAlias(ref tickerKey);
            subscription.ticker = tickerKey;

            if (ClustersUpd.TryGetValue(subscription, out var updater))
            {
                await updater.RemoveConnectionAsync(Context.ConnectionId, Groups);
                if (!updater.Any())
                {
                    ClustersUpd.TryRemove(subscription, out _);
                }

                await subscribeRepository.Subscribe(ClustersUpd.Keys.ToArray());
                LogFlow(
                    "StockChart.CandlesHub.UnSubscribeCluster",
                    $"connectionId={Context.ConnectionId}; requested={requestedKey}; normalized={subscription}; group={updater.key}; groupConnections={updater.ConnectionCount}; activeGroups={ClustersUpd.Count}");
            }
            else
            {
                LogFlow(
                    "StockChart.CandlesHub.UnSubscribeCluster",
                    $"connectionId={Context.ConnectionId}; requested={requestedKey}; normalized={subscription}; status=group_not_found");
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var candlesBefore = CandlesUpd.Count;
            var clustersBefore = ClustersUpd.Count;
            var laddersBefore = Ladders.Count;

            foreach (var updater in CandlesUpd.Values)
            {
                await updater.RemoveConnectionAsync(Context.ConnectionId, Groups);
            }

            foreach (var updater in ClustersUpd.Values)
            {
                await updater.RemoveConnectionAsync(Context.ConnectionId, Groups);
            }

            CleanUpDictionaries();

            foreach (var ticker in Ladders.Keys)
            {
                if (Ladders.TryGetValue(ticker, out var connections))
                {
                    connections.TryRemove(Context.ConnectionId, out _);
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, ticker);

                    if (connections.IsEmpty)
                    {
                        Ladders.TryRemove(ticker, out _);
                        LaddersHash.TryRemove(ticker, out _);
                    }
                }
            }

            await UpdateLadderAsync();

            using var scope = _serviceProvider.CreateScope();
            var subscribeRepository = scope.ServiceProvider.GetRequiredService<ISubscribeRepository>();

            await subscribeRepository.Subscribe(CandlesUpd.Keys.ToArray());
            await subscribeRepository.Subscribe(ClustersUpd.Keys.ToArray());

            LogFlow(
                "StockChart.CandlesHub.OnDisconnected",
                $"connectionId={Context.ConnectionId}; exception={exception?.Message ?? "none"}; candlesBefore={candlesBefore}; clustersBefore={clustersBefore}; laddersBefore={laddersBefore}; candlesAfter={CandlesUpd.Count}; clustersAfter={ClustersUpd.Count}; laddersAfter={Ladders.Count}");

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
                LaddersHash.TryRemove(key, out _);
            }
        }
    }
}
