using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using StockChart.Model;
using StockChart.Repository;
using System.Drawing;
using System.Security.Claims;
namespace StockChart.Pages.Report
{
    public class VolumeSplashModel : PageModel
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
        public VolumeSplashModel(StockProcContext dbContext)
        {
            db = dbContext;
        }
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
        }
    }
}
