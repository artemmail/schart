using Microsoft.AspNetCore.SignalR;
using SignalRMvc.Hubs;
using StockChart.Repository;

namespace StockChart.Hubs
{
    public class TimedHostedService : IHostedService, IDisposable
    {
        private int executionCount = 0;
        private Timer? _timer = null;
        private readonly IHubContext<CandlesHub> _hubContext;
        private readonly ILogger<TimedHostedService> _logger;

        public static int counter = 0;
        public static int counter2 = 0;

        public TimedHostedService(
            IHubContext<CandlesHub> hubContext,
            ILogger<TimedHostedService> logger)
        {
            _logger = logger;
            _hubContext = hubContext;
        }

        public Task StartAsync(CancellationToken stoppingToken)
        {
            Task.Run(async () => await DoWorks(stoppingToken));
            return Task.CompletedTask;
        }

        public async Task DoWorks(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    counter++;
                    await DoWork();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "HUB error {Counter}", counter2);
                    counter2++;
                }

                await Task.Delay(500, stoppingToken);
            }
        }

        private async Task DoWork()
        {
            Interlocked.Increment(ref executionCount);

            var tasks = CandlesHub.Ladders.Keys
                .ToArray()
                .Select(ProcessLadderAsync)
                .ToArray();

            await Task.WhenAll(tasks);
        }

        private async Task ProcessLadderAsync(string ticker)
        {
            if (!CandlesHub.Ladders.TryGetValue(ticker, out var connections) || connections.IsEmpty)
            {
                return;
            }

            var ladder = LadderManager.getRawLadder(ticker);
            if (ladder == null || ladder.Count == 0)
            {
                return;
            }

            var nextHash = ComputeLadderHash(ladder);
            if (!CandlesHub.LaddersHash.TryGetValue(ticker, out var currentHash) || currentHash != nextHash)
            {
                await Task.WhenAll(
                    _hubContext.Clients.Group(ticker).SendCoreAsync("receiveLadder", new object[] { ladder }),
                    _hubContext.Clients.Group(ticker).SendCoreAsync(
                        "receiveLadderEnvelope",
                        new object[] { new { ticker, data = ladder } })
                );
                CandlesHub.LaddersHash[ticker] = nextHash;
            }
        }

        private static int ComputeLadderHash(Dictionary<decimal, int> ladder)
        {
            var hash = new HashCode();
            foreach (var pair in ladder.OrderBy(x => x.Key))
            {
                hash.Add(pair.Key);
                hash.Add(pair.Value);
            }

            return hash.ToHashCode();
        }

        public Task StopAsync(CancellationToken stoppingToken)
        {
            _timer?.Change(Timeout.Infinite, 0);
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _timer?.Dispose();
        }
    }
}
