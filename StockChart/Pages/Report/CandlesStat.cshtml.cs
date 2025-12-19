using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using StockChart.Model;
using StockChart.Repository;
using System.Drawing;
using System.Security.Claims;
using StockChart.Extentions;
namespace StockChart.Pages.Report
{
    public class CandlesStatModel : PageModel
    {
        public Topic Topic = new Topic();
        public string? userId;
        public Topic[] News;
        public Topic[] Blogs;
        private StockProcContext db;
        public List<SelectListItem> BigPeriods;
        public List<SelectListItem> SmallPeriods;
        public string RPeriod;
        public string Period;
        public string bigPeriod;
        public string smallPeriod;
        public double splash = 3;
        ITickersRepository dic;
        IStockMarketServiceRepository stockMarketServiceRepository;
        public CandlesStatModel(StockProcContext dbContext, ITickersRepository dic,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            this.dic = dic;
            this.stockMarketServiceRepository = stockMarketServiceRepository;
            db = dbContext;
        }
        public string ticker;
        public string tickername;
        public string startDate;
        public string endDate;
        public List<SelectListItem> Periods;
        public List<SelectListItem> RPeriods;
        public void OnGet()//(string ticker,  DateTime? startDate, DateTime? endDate, string rperiod = "month", int period = 60)
        {
            string rperiod = "month";
            int period = 60;
            string ticker = "SBER";
            DateTime? startDate = null;
            DateTime? endDate = null;
            stockMarketServiceRepository.UpdateAlias(ref ticker);
            var d =  stockMarketServiceRepository.init_start_end_date(ticker,  rperiod,  startDate,  endDate, 0);
            //var Dates = stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, d.Start.toDateTime(), d.Start.toDateTime(), null, null, null, null);
             Periods = Service.CandlePeriods.GetSelectedList(ListBoxes.PeriodByDefault(rperiod, period));
            this.ticker = ticker;
            this.tickername = dic[ticker.ToUpper()].Shortname;
            this.startDate = d.Start.toDateTime();
            this.endDate = d.End.toDateTime();
            RPeriods = Service.ReportPeriods.GetSelectedList(rperiod);
        }
        /*
        public void OnGet(string bigPeriod, string smallPeriod)
        {
            StockChart.Extentions.Service.init_big_small_periods(ref bigPeriod, ref smallPeriod);
            BigPeriods = StockChart.Extentions.Service.num_days_to_seleclistItems(bigPeriod,
                 StockChart.Extentions.Service._BigPeriods);
            SmallPeriods = StockChart.Extentions.Service.num_days_to_seleclistItems(smallPeriod,
                StockChart.Extentions.Service._SmallPeriods);
            RPeriod = StockChart.Extentions.Service.num_days_to_rperiod(int.Parse(bigPeriod));
             Period = StockChart.Extentions.Service.rperiod_to_period(RPeriod);
            ViewData["bigPeriod"] = BigPeriods;
            ViewData["smallPeriod"] = SmallPeriods;
        }*/
    }
}
