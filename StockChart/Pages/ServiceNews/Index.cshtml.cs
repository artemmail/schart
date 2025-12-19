
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using System.Drawing;
using System.Xml.Linq;
namespace StockChart.Pages
{
    public class IndexPageModel : NewsTableModel
    {
        public IndexPageModel(StockProcContext dbContext) : base(dbContext)
        {
            count = 1000;
        }
        
    }
}
