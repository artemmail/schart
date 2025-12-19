using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Newtonsoft.Json;
using StockChart.Repository;
namespace StockChart.Pages.CandlestickChart
{
    [Authorize]
    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        public object preset;
        ICandlesRepositorySet candlesRepositorySet;
        public IndexModel(ILogger<IndexModel> logger,
            ICandlesRepository candlesRepository,
            ICandlesRepositorySet candlesRepositorySet,
            ITickersRepository dic,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            this.candlesRepositorySet = candlesRepositorySet;
            _logger = logger;
            _candlesRepository = candlesRepository;
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }

        public void OnGet(string? ticker, decimal? priceStep, int? period, string? startDate, string? endDate,
         bool? timeEnable, string? startTime, string? endTime, bool? oiEnable, bool? visualVolume, string rperiod = "day")
        {
            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            if (string.IsNullOrEmpty(rperiod))
            {
                rperiod = "day";
            }
            /*   var xxx = candlesRepositorySet.getRangeSet("SBER*4", "SBER+GAZP",
                   5, new DateTimePair(new DateTime(2023, 3, 1), new DateTime(2023, 3, 11)), 300).Result;
            */
            var result =
              _stockMarketServiceRepository.CandlesParamsToObject(ticker, priceStep, period, rperiod, startDate, endDate,
                    timeEnable, startTime, endTime, visualVolume, "Candles");
            preset = JsonConvert.SerializeObject(result);
        }
    }
}
