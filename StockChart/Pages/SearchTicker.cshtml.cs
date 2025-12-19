using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Newtonsoft.Json;
using StockChart.Repository;
using StockChart.Repository.Services;
using System.Net;
using Wangkanai.Detection.Models;
using Wangkanai.Detection.Services;
using Microsoft.AspNetCore.Mvc;




namespace StockChart.Pages
{


    public class SearchModel : PageModel
    {
        public NewsTableModel _newsTableModel;
        IDetectionService detectionService;
        IYooMoneyRepository yoo;
        ICandlesRepository can;
        ILogger<SearchModel> log;
        StockProcContext db;
        ITickersRepository tikrep;

        public SearchModel(IYooMoneyRepository yoo, StockProcContext dbContext, ITickersRepository tikrep        )
        {
            db = dbContext;
            this.tikrep = tikrep;

            this.yoo = yoo;

            _newsTableModel = new NewsTableModel(dbContext);
        }

        public struct Pair
        {
            public string Key;
            public string Value;
        }

        List<Pair> TickerSearch(string mask, int count, string type = "Candles")
        {
            //Dictionary<string, string> dic = type.Equals("Candles") ? DicCont.Instance.Candles : DicCont.Instance.Clusters;
            //http://stackoverflow.com/questions/23251492/kendo-autocomplete-doesnt-work
            string upperMask = mask.ToUpper();
            int iscluster = type.Equals("Candles") ? 0 : 1;
            var l = tikrep.findByMask(mask, count);


          

            return l.Select(c => new Pair { Key = c.Securityid, Value = c.Shortname }).Take(count).ToList<Pair>();
        }


        public List<Pair> SearchResult;

        public IActionResult OnGet(string needle)
        {
            if (string.IsNullOrEmpty(needle))
                return RedirectToPage("/index");
            var searchResult =
                TickerSearch(needle, 50, "Candles");
            if (searchResult.Count > 1)
                SearchResult = searchResult;
            else if (searchResult.Count == 1)
                return RedirectToPage("/CandlestickChart/Index", new { rperiod = "day", ticker = searchResult[0].Key, period = 1 });
            else
                SearchResult = null;

            return Page();

        }



    }
}