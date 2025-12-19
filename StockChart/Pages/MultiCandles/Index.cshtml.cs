using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Newtonsoft.Json;
using StockChart.Extentions;
using StockChart.Repository;
namespace StockChart.Pages.MultiCandles
{
    public class IndexModel : PageModel
    {
        IStockMarketServiceRepository _stockMarketServiceRepository;
        ITickersRepository _tickers;
        public IndexModel(ITickersRepository dic, IStockMarketServiceRepository stockMarketServiceRepository)
        {
            _stockMarketServiceRepository = stockMarketServiceRepository;
            _tickers = dic;
        }
        public string tickersline;
        public string tickersdesc;
        public string tickers;
        public int period;
        public List<SelectListItem> periods;
        public void OnGet(string tickers, int period = 15)
        {
            this.period = period;
            periods = ListBoxes.MultiPeriods.GetSelectedList(period);
            ModifyTickers(tickers);
        }
        private void ModifyTickers(string s)
        {
            if (s != null)
            {
                List<string> tickers = new List<string>();
                List<string> desc = new List<string>();
                foreach (string v in s.Split(','))
                {
                    string t = v;
                    _stockMarketServiceRepository.UpdateAlias(ref t);
                    if (_tickers.Tickers.ContainsKey(t.ToUpper()))// Candles.ContainsKey(t))
                    {
                        if (!tickers.Contains(t))
                        {
                            tickers.Add(t);
                            desc.Add(_tickers[t].Shortname);
                        }
                    }
                }
                string tickersline = "";
                foreach (var t in tickers)
                    tickersline += (tickersline != "" ? "," : "") + t;
                this.tickersline = tickersline;
                this.tickers = JsonConvert.SerializeObject(tickers);
                for (int i = 0; i < desc.Count; i++)
                {
                    int start = desc[i].IndexOf("(");
                    if (start > -1)
                    {
                        int end = desc[i].IndexOf(")");
                        if (end > -1 && end > start)
                            desc[i] = desc[i].Substring(start + 1, end - start - 1).Trim();
                    }
                }
                this.tickersdesc = JsonConvert.SerializeObject(desc);
            }
        }
    }
}
