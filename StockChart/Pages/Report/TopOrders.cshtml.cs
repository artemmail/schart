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
    public class TopOrdersModel : PageModel
    {
        public Topic Topic = new Topic();
        public string? userId;
        public Topic[] News;
        public Topic[] Blogs;
        private StockProcContext db;
        public TopOrdersModel(StockProcContext dbContext)
        {
            db = dbContext;             
        }
        public string ticker;
        public string bigPeriod;
        public List<SelectListItem> BigPeriods;
        public void OnGet(string ticker, string bigPeriod)
        {
            if (string.IsNullOrEmpty(ticker))
                ticker="GAZP";
            if (string.IsNullOrEmpty(bigPeriod))
                bigPeriod="3";
            this.ticker=ticker;
            BigPeriods= StockChart.Extentions.Service.num_days_to_seleclistItems(bigPeriod, new int[] { 1, 3, 7, 14 });
            this.bigPeriod=bigPeriod;            
        }
        
    }
}
