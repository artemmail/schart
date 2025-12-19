using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Services;
using System.Drawing;
using System.Security.Claims;
namespace StockChart.Pages.Portfolio
{
    public class PortfolioOptimizationModel : PageModel
    {
       

        ICandlesRepository _candlesRepository;
        IClusterRepository _clusterRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        ITickersRepository _tickers;
        IReportsRepository _reports;
        ICandlesRepositorySet _candlesRepositorySet;
        public PortfolioOptimizationModel(
            StockProcContext dbContext,
            ICandlesRepository candlesRepository,
            ICandlesRepositorySet candlesRepositorySet,
            ITickersRepository tickers,
            IReportsRepository reports,
            IClusterRepository clusterRepository,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            
            _candlesRepositorySet = candlesRepositorySet;
            _clusterRepository = clusterRepository;
            _tickers = tickers;
            _reports = reports;
            _candlesRepository = candlesRepository;
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }

        public string startDate;
        public string endDate;
        public string portfolioDate;
        public string tickers;
        public decimal deposit;
        public decimal risk;
        public List<SelectListItem> Portfolios;
        public List<SelectListItem> RPeriods;
        public string rperiod = "year";

        public void OnGet(string tickers, decimal? deposit, decimal? risk)
        {


            string? startDate = null, endDate = null;            
            bool timeEnable = false;
            string startTime = "";
            string endTime = "";
           // var pair = _stockMarketServiceRepository.init_start_end_date(null,  rperiod,  startDate,  endDate, 0);
            //DateTime startDateTime = startDate.parseDateTime();
            //DateTime endDateTime = endDate.parseDateTime();
            var Dates = _stockMarketServiceRepository.getStartEndDateTime(null, rperiod, startDate, endDate, null,  startTime, endTime, timeEnable);
            this.startDate = Dates.Start.toDateTime();
            this.endDate = Dates.End.toDateTime();
            this.portfolioDate = new DateTime(DateTime.Now.AddMonths(-3).Year,DateTime.Now.AddMonths(-3).Month,1).toDateTime();
            this.tickers = tickers;
            this.deposit = deposit ?? 1000000;
            this.Portfolios = ListBoxes.PortfolioItems.GetSelectedList(0);
            this.risk = risk ?? 0;
            RPeriods = ListBoxes.ReportPeriods.GetSelectedList("day");

        }
    }
}
