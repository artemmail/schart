using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Newtonsoft.Json;
using StockChart.Repository;
namespace StockChart.Pages.Report
{
    public class VolumeSearchModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        public object preset;
        public VolumeSearchModel(ILogger<IndexModel> logger,
            ICandlesRepository candlesRepository,
            ITickersRepository dic,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            _logger = logger;
            _candlesRepository = candlesRepository;            
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }
                
        public void OnGet(string? ticker, decimal? priceStep, int? period,  string? startDate, string? endDate,
         bool? timeEnable, string? startTime, string? endTime, bool? oiEnable, bool? visualVolume, string rperiod= "day")
        {
            ViewData["LastDate"] = _stockMarketServiceRepository.LastTradingDateCached(0).ToString("dd.MM.yyyy");
            if (string.IsNullOrEmpty(rperiod) && period == null)
            {
                rperiod = "day";
                period = 15;
            }
            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            var result =
              _stockMarketServiceRepository.CandlesParamsToObject(ticker, priceStep, period, rperiod, startDate, endDate,
                    timeEnable, startTime, endTime, visualVolume, "Cluster");
            preset = JsonConvert.SerializeObject(result);            
        }
    }
}
