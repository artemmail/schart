using Microsoft.AspNetCore.Mvc;

namespace StockChart.Controllers
{
    public class AngularAppController : Controller
    {
        public IActionResult Index()
        {
            return PhysicalFile(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html"), "text/HTML");
        }
    }
}


