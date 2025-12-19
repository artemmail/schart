using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Newtonsoft.Json;
using StockChart.Extentions;
using StockChart.Repository;
namespace StockChart.Pages.CandlestickChart
{
    public class PairTradingModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        public object preset;
        public List<SelectListItem> rperiods;
        public List<SelectListItem> periods;
        public PairTradingModel(ILogger<IndexModel> logger,
            ICandlesRepository candlesRepository,
            ITickersRepository dic,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            _logger = logger;
            _candlesRepository = candlesRepository;            
            _stockMarketServiceRepository = stockMarketServiceRepository;
            //     reportlist = ListBoxes.ReportPeriods.GetSelectedList("day");
          
        }
        public string ticker1;
        public string ticker2;
        public string ticker3;
        public DateTime LastDate;
        public void OnGet(string? ticker1, string? ticker2, decimal? priceStep, int? period, string? startDate, string? endDate,
         bool? timeEnable, string? startTime, string? endTime, bool? oiEnable, bool? visualVolume, string rperiod = "day")
        {
            ViewData["LastDate"] = _stockMarketServiceRepository.LastTradingDateCached(0).ToString("dd.MM.yyyy");
            rperiods = ListBoxes.ReportPeriods.GetSelectedList(rperiod??ListBoxes.ReportPeriods[2].Value);
            periods = ListBoxes.CandlePeriods.GetSelectedList(period??ListBoxes.CandlePeriods[6].Value);
            //  _stockMarketServiceRepository.init_start_end_date(null,  rperiod,  startDate,  endDate,0);
            var Dates = _stockMarketServiceRepository.getStartEndDateTime(null, rperiod, startDate, endDate, null, startTime, endTime, timeEnable ?? false);
            if (string.IsNullOrEmpty(ticker1))
                ticker1 = "GAZP*200+LKOH*10";
            if (string.IsNullOrEmpty(ticker2))
                ticker2 = "GMKN*3+SBER*300";
            _stockMarketServiceRepository.UpdateAlias(ref ticker1);
            _stockMarketServiceRepository.UpdateAlias(ref ticker2);
            this.ticker1 = ticker1;
            this.ticker2 = ticker2;
           
           
        }
    }
}
