using StockChart.Model;
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



        private readonly ApplicationDbContext _dbContext;
        private readonly IConfiguration _configuration;

        public SitemapController(ApplicationDbContext dbContext, IConfiguration configuration)
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
            var newsUrls = await _dbContext.Topics
                .AsNoTracking()
                .Select(t => new { Url = $"{baseUrl}/ServiceNews/Content/{t.Slug}", LastMod = t.Date })
                .ToListAsync();

            var bondUrls = await (
                from d in _dbContext.Dictionaries.AsNoTracking()
                join bs in _dbContext.BondSpecs.AsNoTracking() on d.Id equals bs.DictionaryId
                orderby d.Id
                select new
                {
                    Url = $"{baseUrl}/bonds/{d.Securityid}",
                    LastMod = bs.UpdatedAt
                })
                .ToListAsync();

            var statementTickers = await (
                from d in _dbContext.Dictionaries.AsNoTracking()
                where d.Market == 0 && d.ToDate == null
                join e in _dbContext.FinancialStatementEntries.AsNoTracking()
                    on d.Id equals e.DictionaryId
                where e.Standard == "MSFO" || e.Standard == "RSBU"
                group e by new { d.Id, d.Securityid } into g
                orderby g.Key.Id
                select new
                {
                    Ticker = g.Key.Securityid,
                    LastMod = g.Max(x => x.ImportedAt)
                })
                .ToListAsync();

            var reportsUrls = statementTickers
                .SelectMany(x => new[]
                {
                    new { d = x.LastMod, s = $"{baseUrl}/statements/{x.Ticker}" },
                    new { d = x.LastMod, s = $"{baseUrl}/Dividends/{x.Ticker}" },
                    new { d = x.LastMod, s = $"{baseUrl}/ShareHolders/{x.Ticker}" }
                })
                .ToList();

            // Формируем список URL
            var urls = newsUrls
                .Select(x => new { d = x.LastMod, s = x.Url })
                .Concat(bondUrls.Select(x => new { d = x.LastMod, s = x.Url }))
                .Concat(reportsUrls)
                .ToList();

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
