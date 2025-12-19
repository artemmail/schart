using StockChart.EventBus.Models;
using SignalRMvc.Hubs;
using StockChart.Repository;

namespace StockChart.Hubs
{
    public class CandlesUpdater
    {
        ICandlesRepository _candlesRepository;
        HashSet<string> Connections = new HashSet<string>();
        CandlesHub _hub;
        public async Task AddConnection(string con)
        {
            await _hub.Groups.AddToGroupAsync(con, key.ToString());
            Connections.Add(con);
            //    _logger.LogTrace($"connect {key.ToString()} {Connections.Count}");
        }
        public async Task RemoveConnectionAsync(string con)
        {
            await _hub.Groups.RemoveFromGroupAsync(con, key.ToString());
            if (Connections.Contains(con))
                Connections.Remove(con);
            //   _logger.LogTrace($"disconnect {key.ToString()} {Connections.Count}");
        }
        public bool Any()
        {
            return Connections.Any();
        }
        IServiceProvider serviceProvider;
        ILogger<CandlesUpdater> _logger;
        public CandlesUpdater(
            IServiceProvider serviceProvider,
            ILogger<CandlesUpdater> _logger,
            CandlesHub hub,
            ICandlesRepository candlesRepository,
            IStockMarketServiceRepository stockMarketServiceRepository,
            ITickersRepository tickers,
            SubsCandle key)
        {
            this._logger = _logger;
            this.serviceProvider = serviceProvider;
            _hub = hub;

            ticker = key.ticker;
            period = key.period.Value;
            this.key = key.ToString();
            realTicker = ticker;
            stockMarketServiceRepository.UpdateAlias(ref realTicker);
            var tt = tickers[realTicker];
            id = tt.Id;
            market = tt.Market ?? 0;
        }
        string realTicker;
        public string ticker { get; set; }
        public double period { get; set; }
        int id;
        int market;
        decimal old_volume = 0;
        public string key;


        /* public async Task<object?> GetUpd()
         {

             using (IServiceScope scope = serviceProvider.CreateScope())
             {
                 try
                 {
                     //_stockMarketServiceRepository =                    scope.ServiceProvider.GetRequiredService<IStockMarketServiceRepository>();
                     _candlesRepository =
                         scope.ServiceProvider.GetRequiredService<ICandlesRepository>();
                     List<BaseCandle> candles = await _candlesRepository.GetLastCandles(id, period > 0 && period < 1 ? 1 : (int)period, 3);
                     if (!candles.Any())
                         return null;
                     decimal volume = 0;
                     for (int i = 0; i < candles.Count; i++)
                         volume += candles[i].Volume;
                     if (volume == old_volume)
                         return null;
                     old_volume = volume;
                     return new { key = new { ticker, period }, data = CandlePacker.PackCandlesResult(candles, false) };
                 }
                 catch (Exception e)
                 {
                     _logger.LogError($" {e.StackTrace} {e.Message}");
                 }
                 return null;
             }
         }*/
    }
}
