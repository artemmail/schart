using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Xml.Linq;

using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SitemapController : ControllerBase
    {



        private readonly StockProcContext _dbContext;
        private readonly IConfiguration _configuration;

        public SitemapController(StockProcContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _configuration = configuration;
        }

        [HttpGet("/sitemap.xml")]
        public async Task<IActionResult> GetSitemap()
        {
            // Извлекаем схему (http или https) и хост из текущего запроса
            var scheme = Request.Scheme; // Например, "https"
            var host = Request.Host.Value; // Например, "ru-ticker.com"

            // Формируем базовый URL
            var baseUrl = $"{scheme}://{host}";

            // Извлекаем все необходимые Slug из таблицы Topics
            var slugs = await _dbContext.Topics                
                .Select(t => new { t.Slug, t.Date })
                .ToListAsync();

            // Формируем список URL
            var urls = slugs.Select(slug =>new {d=slug.Date,s= $"{baseUrl}/ServiceNews/Content/{slug}" }).ToList();

            // Создаем XML документ
            XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
            var sitemap = new XDocument(
                new XDeclaration("1.0", "utf-8", "yes"),
                new XElement(ns + "urlset",
                    from url in urls
                    select new XElement(ns + "url",
                        new XElement(ns + "loc", url.s),
                        new XElement(ns + "lastmod", url.d.ToString("yyyy-MM-dd")),
                        new XElement(ns + "changefreq", "weekly"),
                        new XElement(ns + "priority", "0.8")
                    )
                )
            );

            // Возвращаем XML с правильным типом контента
            return Content(sitemap.ToString(), "application/xml", Encoding.UTF8);
        }
    }
}
