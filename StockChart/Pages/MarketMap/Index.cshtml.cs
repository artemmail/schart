using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using StockChart.Extentions;
using StockChart.Repository;
namespace StockChart.Pages.MarketMap
{
    public class IndexModel : PageModel
    {           
        IStockMarketServiceRepository _stockMarketServiceRepository;
        ITickersRepository _tickers;
        public string ticker;
        StockProcContext db;
        public List<SelectListItem> rperiods;
        public List<SelectListItem> reportlist;
        public List<SelectListItem> categorylist;
        public List<SelectListItem> stylelist;
        public List<SelectListItem> marketList;
        public List<SelectListItem> toplist;
        public DateTimePair Dates;
        public IndexModel(
            ITickersRepository dic,
            StockProcContext dbContext,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            db = dbContext;
            _stockMarketServiceRepository = stockMarketServiceRepository;
            _tickers = dic;
        }
        public void OnGet(string rperiod, DateTime? startDate, DateTime? endDate)
        {
            ViewData["LastDate"] = _stockMarketServiceRepository.LastTradingDateCached(0).ToString("dd.MM.yyyy");
            if (string.IsNullOrEmpty(rperiod))
                rperiod = "day";
            Dates = _stockMarketServiceRepository.init_start_end_date(null,  rperiod,  startDate,  endDate,0);
            reportlist = ListBoxes.ReportPeriods.GetSelectedList("day");
            rperiods = ListBoxes.ReportPeriods.GetSelectedList("day");
            categorylist = db.CategoryTypes
                .Select(val => new SelectListItem { Text = val.Name, Value = val.Id.ToString(), Selected = false }).ToList();
            stylelist = new List<SelectListItem>()
            {
                new SelectListItem { Text = "Карта", Value = "0", Selected = true},
                new SelectListItem { Text = "Доска", Value = "1", Selected = false }
            };
            toplist = new List<SelectListItem>()
            {
                new SelectListItem { Text = "Все", Value = "1000", Selected = true},
                new SelectListItem { Text = "Топ 20", Value = "20", Selected = false},
                new SelectListItem { Text = "Топ 50", Value = "50", Selected = false},
                new SelectListItem { Text = "Топ 100", Value = "100", Selected = false}
            };
            int a = 0;
            marketList = _tickers.MarketById.Values
               .OrderBy(x => x.Id)
               .Select(x => new SelectListItem() { Text = x.Name, Value = x.Id.ToString(), Selected = a++ == 0 }).ToList();                       
        }
        
    }
}
