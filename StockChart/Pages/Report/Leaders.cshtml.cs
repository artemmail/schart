using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository;
using System.Drawing;
using System.Security.Claims;
namespace StockChart.Pages.Report
{
    public class LeadersModel : PageModel
    {
        public Topic Topic = new Topic();
        public string? userId;
        public Topic[] News;
        public Topic[] Blogs;
        private StockProcContext db;
        public LeadersModel(StockProcContext dbContext)
        {
            db = dbContext;             
        }
        public List<SelectListItem> ReportList;
        public List<SelectListItem> TopList;
        public List<SelectListItem> rperiods;
        public void OnGet(int count)
        {            
            ReportList= StockChart.Extentions.Service.MarketLeadersReports.GetSelectedList("year");
            TopList = StockChart.Extentions.Service.TopLeaders.GetSelectedList(50);
            rperiods = ListBoxes.ReportPeriods.GetSelectedList("year");
        }
        
    }
}
