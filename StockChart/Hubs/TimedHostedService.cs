using SignalRMvc.Hubs;
using StockChart.Repository;

namespace StockChart.Hubs
{
    /*
    internal interface IScopedProcessingService
    {
        Task DoWork(CancellationToken stoppingToken);
    }
    internal class ScopedProcessingService : IScopedProcessingService
    {
        private int executionCount = 0;
        CandlesHub _uptimeHub;
        public ScopedProcessingService(CandlesHub candlesHub)
        {
            _uptimeHub = candlesHub;
        }
        public async Task DoWork(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var count = Interlocked.Increment(ref executionCount);
                HashSet<string> frozenTickers = new HashSet<string>();
                foreach (var k in CandlesHub.CandlesUpd.Keys.ToArray())
                    if (!frozenTickers.Contains(k.ticker))
                    {
                        var updater = _uptimeHub.GetCandleUpdater(k);
                        object? res = await CandlesHub.CandlesUpd[k].GetUpd();
                        if (res != null)
                            await _uptimeHub.Clients.Group(k.ToString())
                                .SendCoreAsync("recieveCandle", new object[] { JsonConvert.SerializeObject(res) });
                        else
                            frozenTickers.Add(k.ticker);
                    }
                await Task.Delay(500, stoppingToken);
            }
        }
    }
    */
    public class TimedHostedService : IHostedService, IDisposable
    {
        private int executionCount = 0;
        private Timer? _timer = null;
        CandlesHub _uptimeHub;
        ICandlesRepository _candlesRepository;
        IServiceProvider serviceProvider;
        ILogger<TimedHostedService> logger_;

        public static int counter = 0;
        public static int counter2 = 0;

        public TimedHostedService(IServiceProvider serviceProvider, CandlesHub candlesHub,
            ILogger<TimedHostedService> logger)
        {
            logger_ = logger;
            this.serviceProvider = serviceProvider;

            //_candlesRepository = candlesRepository;
            _uptimeHub = candlesHub;


        }
        public Task StartAsync(CancellationToken stoppingToken)
        {
            /*
            _timer = new Timer(DoWork, null, TimeSpan.Zero,
            TimeSpan.FromMilliseconds(200));*/
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
                    logger_.LogError($"HUB{counter2} {ex.InnerException.Message} {ex.StackTrace}");
                    counter2++;
                }
                await Task.Delay(500, stoppingToken);
            }
        }
        private async Task DoWork()
        {
            var count = Interlocked.Increment(ref executionCount);
            HashSet<string> frozenTickers = new HashSet<string>();

            var tasks = new List<Task>();

            foreach (var k in CandlesHub.Ladders.Keys.ToArray())
            {
                tasks.Add(ProcessLadderAsync(k));
            }

            Task.WhenAll(tasks);
        }

        private async Task ProcessLadderAsync(string k)
        {
            if (CandlesHub.Ladders.ContainsKey(k) && CandlesHub.Ladders[k].Any())
            {
                var r = LadderManager.getRawLadder(k);
                if (r != null && r.Count > 0)
                {
                    if (r.Keys.Count < 2)
                    {
                        int a = 0;
                        a++;
                    }
                    if (!CandlesHub.LaddersHash.ContainsKey(k) || r.GetHashCode() != CandlesHub.LaddersHash[k])
                    {
                        await _uptimeHub.Clients.Group(k.ToString()).SendCoreAsync("receiveLadder", new object[] { r });
                    }
                    CandlesHub.LaddersHash[k] = r.GetHashCode();
                }
            }
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
