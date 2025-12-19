using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Model;
using StockChart.Repository;
using System.Drawing;
using System.Security.Claims;
namespace StockChart.Pages.ServiceNews
{
    public class ListModel : PageModel
    {
        public Topic Topic = new Topic();
        public string? userId;
        public Topic[] News;
        public Topic[] Blogs;
        private StockProcContext db;
        public ListModel(StockProcContext dbContext)
        {
            db = dbContext;             
        }
     
        public void OnGet(int count)
        {
            userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            News = db.Topics.OrderByDescending(x => x.Date).Take(count).ToArray();
            Blogs = db.Topics.OrderByDescending(x => x.Date).Take(count).ToArray();
        }
        
    }
}
