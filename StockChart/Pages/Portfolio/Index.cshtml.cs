using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository;
using System.Drawing;
using System.Security.Claims;
namespace StockChart.Pages.Portfolio
{
    public class PortfolioModel : PageModel
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
        public PortfolioModel(StockProcContext dbContext)
        {
            db = dbContext;
        }

        public List<SelectListItem> Periods;
        public List<SelectListItem> Portfolios;
        public void OnGet(string bigPeriod, string smallPeriod)
        {
            Periods = ListBoxes.MultiPeriods.GetSelectedList(1);
           Portfolios  = ListBoxes.PortfolioItems.GetSelectedList(0);
     
        }
    }
}
