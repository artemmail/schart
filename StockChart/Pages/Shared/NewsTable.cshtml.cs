
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
namespace StockChart.Pages
{

    public class NewsTableModel : PageModel
    {
        private StockProcContext db;
        public line?[] Blogs()
        {
            return db.Topics
                .Where(x => x.Text != null && !x.Text.Contains("Sponsored"))
                .OrderByDescending(x => x.Date)
                .Take(count)
                .Include(x => x.UserComments)
                .Include(x => x.User)
                .Select(x => new line
                {
                    Id = x.Id,
                    Date = x.Date.ToShortDateString(),
                    CommentCount = x.UserComments.Count,
                    Header = x.Header,
                    Author = x.User.UserName,
                    Slug = x.Slug
                }).ToArray();
        }
        public int count = 10;
        public NewsTableModel(StockProcContext dbContext)
        {
            db = dbContext;

        }
        public void OnGet(int conut = 5)
        {
        }
    }
}
