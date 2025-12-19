using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
namespace StockChart.Repository
{
    public static class LadderManager
    {
        static string oldSettings = "";
        const string tickerFormatPath = "c:/lua/doms/{0}.txt";
        public static Dictionary<decimal, int> getLadder(string ticker)
        {
            try
            {
                using (FileStream fs = new FileStream(string.Format(tickerFormatPath, ticker), FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                {
                    using (StreamReader sr = new StreamReader(fs))
                    {
                        var text = sr.ReadToEnd();
                        return JsonConvert.DeserializeObject<Dictionary<decimal, int>>(text);
                    }
                }
            }
            catch
            {
                return null;
            }
        }
        public static Dictionary<decimal,int> getRawLadder(string ticker)
        {
            try
            {
                using (FileStream fs = new FileStream(string.Format(tickerFormatPath, ticker), FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                {
                    using (StreamReader sr = new StreamReader(fs))
                    {
                        var text = sr.ReadToEnd();
                       
                       
                        return JsonConvert.DeserializeObject<Dictionary<decimal, int>>(text);
                       
                       
                    }
                }
            }
            catch
            {
                return null;
            }
        }
        public static Dictionary<decimal, int> getLadder(string ticker, decimal step)
        {
            if (step <= 0)
                step = 0.00001m;
            var ladder = getLadder(ticker);
            if (ladder != null)
            {
                Dictionary<decimal, int> res = new Dictionary<decimal, int>();
                foreach (var key in ladder.Keys)
                {
                    decimal newkey = Math.Round(key / step) * step;
                    if (res.ContainsKey(newkey))
                        res[newkey] += ladder[key];
                    else
                        res[newkey] = ladder[key];
                }
                return res;
            }
            else
                return null;
        }
    }
}
