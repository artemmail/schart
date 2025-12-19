using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using StockChart.EventBus.Models;
using StockChart.Model;
using System.Collections.Concurrent;
using System.Globalization;
using System.Net.Http.Headers;
using System.Reflection.PortableExecutable;
using Tensorflow;
using static Microsoft.ML.Data.SchemaDefinition;

namespace StockChart.Repository
{
    public class CandlesRepository : ICandlesRepository
    {
        private StockProcContext _dbContext;
        ITickersRepository tikrep;

        ILogger<CandlesRepository> _logger;
        string apiPath;
        HttpClient client_;
        public CandlesRepository(HttpClient client, StockProcContext dbContext, ITickersRepository tikrep, ILogger<CandlesRepository> logger, IOptions<RecieverOptions> options)
        {
            client_ = client;
            apiPath = options.Value.apiPath + "/api/Candles/";
            this.tikrep = tikrep;
            _logger = logger;

            _dbContext = dbContext;

        }



        public async Task<List<ClusterColumnBase>> GetTradesCandles(string ticker, DateTime startDate, DateTime endDate)
        {
            var res = await GetTicks(ticker, startDate, endDate);
            return GenerateCandlesForPeriod3(res);
        }

        public async Task<List<ClusterColumnWCF>> GetTradesClusters(string ticker, DateTime startDate, DateTime endDate, decimal m_priceStep)
        {
            var res = await GetTicks(ticker, startDate, endDate);
            return GenerateCandlesForPeriod_3(res, m_priceStep);
        }


        private List<ClusterColumnWCF> GenerateCandlesForPeriod_3(List<tick> trades, decimal m_priceStep)
        {
            List<ClusterColumnDic> candlesList = new List<ClusterColumnDic>();
            int last_number = 0;

            // Обрабатываем трейды и создаем свечи
            for (; last_number < trades.Count; last_number++)
            {
                var trade = trades[last_number];
                var tradeBefore = last_number > 0 ? trades[last_number - 1] : null;

                // Если это первый трейд или он не относится к текущей свече
                if (last_number == 0 || tradeBefore == null || !IsSameCandle(trade, tradeBefore))
                {
                    // Создаем новую свечу
                    var a = new ClusterColumnDic
                    {
                        x = trade.TradeDate, // Дата
                        o = trade.Price,     // Open price
                        c = trade.Price,     // Close price
                        l = trade.Price,     // Low price
                        h = trade.Price,     // High price
                        q = trade.Quantity,  // Quantity
                        bq = trade.Quantity * trade.Direction, // Buy quantity
                        v = trade.Volume,    // Volume
                        bv = trade.Volume * trade.Direction,   // Buy volume
                        oi = trade.OI        // Open Interest
                    };

                    decimal roundprice = Math.Round((trade.Price / m_priceStep)) * m_priceStep;

                    a.ColumnDictionary[roundprice] = new cluster
                    {
                        p = trade.Price,
                        q = trade.Quantity,
                        bq = trade.Quantity * trade.Direction,
                        mx = trade.Direction>0? trade.Quantity: -trade.Quantity,
                        ct = 1
                    };

                    candlesList.Add(a);
                }
                else
                {
                    // Обновляем последнюю свечу
                    var lastCandle = candlesList.Last();

                    lastCandle.c = trade.Price; // Закрытие свечи
                    lastCandle.l = Math.Min(lastCandle.l, trade.Price); // Минимальная цена
                    lastCandle.h = Math.Max(lastCandle.h, trade.Price); // Максимальная цена
                    lastCandle.q += trade.Quantity; // Объем сделок
                    lastCandle.bq += trade.Quantity * trade.Direction; // Покупки
                    lastCandle.v += trade.Volume; // Объем
                    lastCandle.bv += trade.Volume * trade.Direction; // Покупки по объему
                    lastCandle.oi = trade.OI; // Открытые позиции

                    decimal roundprice = Math.Round((trade.Price / m_priceStep)) * m_priceStep;


                    if (lastCandle.ColumnDictionary.ContainsKey(roundprice))
                    {
                        var zz = lastCandle.ColumnDictionary[roundprice];
                        zz.ct++;
                        zz.q += trade.Quantity;
                        zz.bq += (trade.Direction > 0) ? trade.Quantity : 0;
                        if (trade.Quantity > Math.Abs(zz.mx))
                            zz.mx = (trade.Direction > 0) ? trade.Quantity : -trade.Quantity;                        
                    }
                    else
                        lastCandle.ColumnDictionary[roundprice] = new cluster
                        {
                            p = trade.Price,
                            q = trade.Quantity,
                            bq = trade.Quantity * trade.Direction,
                            mx = trade.Direction > 0 ? trade.Quantity : -trade.Quantity,
                            ct = 1
                        };

                }
            }

            return candlesList.Select(x=>x.Convert()).ToList();
        }


        private List<ClusterColumnBase> GenerateCandlesForPeriod3(List<tick> trades)
        {
            List<ClusterColumnBase> candlesList = new List<ClusterColumnBase>();
            int last_number = 0;

            // Обрабатываем трейды и создаем свечи
            for (; last_number < trades.Count; last_number++)
            {
                var trade = trades[last_number];
                var tradeBefore = last_number > 0 ? trades[last_number - 1] : null;

                // Если это первый трейд или он не относится к текущей свече
                if (last_number == 0 || tradeBefore == null || !IsSameCandle(trade, tradeBefore))
                {
                    // Создаем новую свечу
                    candlesList.Add(new ClusterColumnBase
                    {
                        x = trade.TradeDate, // Дата
                        o = trade.Price,     // Open price
                        c = trade.Price,     // Close price
                        l = trade.Price,     // Low price
                        h = trade.Price,     // High price
                        q = trade.Quantity,  // Quantity
                        bq = trade.Quantity * trade.Direction, // Buy quantity
                        v = trade.Volume,    // Volume
                        bv = trade.Volume * trade.Direction,   // Buy volume
                        oi = trade.OI        // Open Interest
                    });
                }
                else
                {
                    // Обновляем последнюю свечу
                    var lastCandle = candlesList.Last();

                    lastCandle.c = trade.Price; // Закрытие свечи
                    lastCandle.l = Math.Min(lastCandle.l, trade.Price); // Минимальная цена
                    lastCandle.h = Math.Max(lastCandle.h, trade.Price); // Максимальная цена
                    lastCandle.q += trade.Quantity; // Объем сделок
                    lastCandle.bq += trade.Quantity * trade.Direction; // Покупки
                    lastCandle.v += trade.Volume; // Объем
                    lastCandle.bv += trade.Volume * trade.Direction; // Покупки по объему
                    lastCandle.oi = trade.OI; // Открытые позиции
                }
            }

            return candlesList;
        }

        // Метод для проверки, относится ли трейд к текущей свече
        private bool IsSameCandle(tick trade, tick tradeBefore)
        {
            // Логика проверки: если трейды следуют друг за другом и имеют одинаковые даты и направления
            return (trade.Number - tradeBefore.Number == 1
                    && trade.TradeDate == tradeBefore.TradeDate
                    && trade.Direction == tradeBefore.Direction);
        }


        public async Task<List<ClusterColumnBase>> ClusterProfileQuery(string ticker, decimal period, DateTimePair Dates, decimal step, bool Postmarket)
        {
            decimal minPrice = decimal.MaxValue;
            decimal maxPrice = 0;
            DateTime curDate = DateTime.MinValue;
            ClusterColumnBase? col = null;
            List<Candle> res;// = await GetCandles(ticker, (int)period, Dates.Start, Dates.End, 10000);

            if (Dates.Start.Date == DateTime.Now.Date)
            {
                res = await GetCandlesQuick(ticker, (double)period, Dates.Start, Dates.End, 10000);
                if (res.IsNullOrEmpty())
                {
                    res = await GetCandles(ticker, (double)period, Dates.Start, Dates.End, 10000);
                }
            }
            else
                res = await GetCandles(ticker, (double)period, Dates.Start, Dates.End, 10000);

            var list = res.Select(row => new ClusterColumnBase()
            {
                x = row.Period,
                o = row.OpnPrice,
                c = row.ClsPrice,
                l = row.MinPrice,
                h = row.MaxPrice,
                oi = row.Oi,
                q = row.Quantity,
                bq = row.BuyQuantity,
                v = row.Volume,
                bv = row.BuyVolume
            }).ToList();

            return list;
        }

        public async Task<List<Candle>> GetCandles(string ticker, double period, DateTime startDate, DateTime endDate, int top)
        {
            try
            {
                if (startDate.Date == DateTime.Now.Date)
                {
                    var res = await GetCandlesQuick(ticker, period, startDate, endDate, top);
                    if (!res.IsNullOrEmpty())
                    {
                        return res;
                    }
                }
            }
            catch (Exception ex)
            {
            }
            return await _dbContext.GetCandlesAsync(ticker, period, startDate, endDate, top);
        }

        public async Task<List<Candle>> GetCandlesGlued(string ticker, int period, DateTime startDate, DateTime endDate, int top)
        {
            try
            {
                if (startDate.Date == DateTime.Now.Date)
                {
                    var res = await GetCandlesQuick(ticker, period, startDate, endDate, top);
                    if (!res.IsNullOrEmpty())
                    {
                        return res;
                    }
                }
            }
            catch (Exception ex)
            {
            }
            return await _dbContext.GetCandlesGluedAsync(ticker, period, startDate, endDate, top);
        }



        public async Task<List<ClusterColumnBase>> GetCandlesGlued1(string ticker, int period, DateTime startDate, DateTime endDate, int top)
        {
            try
            {
                if (startDate.Date == DateTime.Now.Date)
                {
                    var res1 = await GetCandlesQuick(ticker, period, startDate, endDate, top);
                    if (!res1.IsNullOrEmpty())
                    {
                        var list1 = res1.Select(row => new ClusterColumnBase()
                        {
                            x = row.Period,
                            o = row.OpnPrice,
                            c = row.ClsPrice,
                            l = row.MinPrice,
                            h = row.MaxPrice,
                            oi = row.Oi,
                            q = row.Quantity,
                            bq = row.BuyQuantity,
                            v = row.Volume,
                            bv = row.BuyVolume
                        }).ToList();

                        return list1;
                    }
                }
            }
            catch (Exception ex)
            {
            }
            var res = await _dbContext.GetCandlesGluedAsync(ticker, period, startDate, endDate, top);



            var list = res.Select(row => new ClusterColumnBase()
            {
                x = row.Period,
                o = row.OpnPrice,
                c = row.ClsPrice,
                l = row.MinPrice,
                h = row.MaxPrice,
                oi = row.Oi,
                q = row.Quantity,
                bq = row.BuyQuantity,
                v = row.Volume,
                bv = row.BuyVolume
            }).ToList();

            return list;
        }




        public async Task<List<Candle>> GetCandlesQuick(string ticker, double period, DateTime startDate, DateTime endDate, int top)
        {
            var startTime = DateTime.Now;

            {
                //     client1.Timeout = TimeSpan.FromMilliseconds(period >= 1 ? 200 : 5000);
                var db = JsonConvert.SerializeObject(new DateTime(startDate.Ticks)).Replace("\"", "");
                var de = JsonConvert.SerializeObject(new DateTime(endDate.Ticks)).Replace("\"", "");
                var uri = apiPath + $"CandlesQuery/{ticker}?period={period.ToStringInvariant()}&startDate={db}&endDate={de}";

                try
                {
                    using (var response = await client_.GetAsync(uri))
                    {

                        var responseBody = await response.Content.ReadAsStringAsync();
                        List<Candle> cp = JsonConvert.DeserializeObject<List<Candle>>(responseBody);
                        //       _logger.LogTrace($"Region {DateTime.Now - startTime} url: {uri} len: {cp.Count}");
                        return cp;
                    }
                }
                catch (Exception ex)
                {
                    int t = 0;
                    t++;
                    return null;
                }
            }
        }

        public async Task<List<tick>> GetTicksQuick(string ticker, DateTime startDate, DateTime endDate)
        {
            var startTime = DateTime.Now;


            //     client1.Timeout = TimeSpan.FromMilliseconds(period >= 1 ? 200 : 5000);
            var db = JsonConvert.SerializeObject(new DateTime(startDate.Ticks)).Replace("\"", "");
            var de = JsonConvert.SerializeObject(new DateTime(endDate.Ticks)).Replace("\"", "");
            var uri = apiPath + $"Ticks/{ticker}?&startDate={db}&endDate={de}";

            try
            {
                using (var response = await client_.GetAsync(uri))
                {

                    var responseBody = await response.Content.ReadAsStringAsync();
                    return JsonConvert.DeserializeObject<List<tick>>(responseBody);
                    //       _logger.LogTrace($"Region {DateTime.Now - startTime} url: {uri} len: {cp.Count}");

                }
            }
            catch (Exception ex)
            {
                int t = 0;
                t++;
                return null;
            }

        }


        public async Task<List<tick>> GetTicks(string ticker, DateTime startDate, DateTime endDate)
        {

            try
            {
                if (startDate.Date == DateTime.Now.Date)
                {
                    var res = await GetTicksQuick(ticker, startDate, endDate);
                    if (!res.IsNullOrEmpty())
                    {
                        return res;
                    }
                }
            }
            catch (Exception ex)
            {
            }

            return (await _dbContext.tickersIdAsync(tikrep[ticker].Id, startDate, endDate)).OrderBy(x => x.Number)
                .Select(x =>
                   new tick()
                   {
                       Direction = x.Direction,
                       Number = x.Number & 0x0000ffffffffffff,
                       Quantity = x.Quantity,
                       Volume = x.Volume,
                       Price = x.Price,
                       OI = x.OI,
                       TradeDate = x.TradeDate
                   })
                .ToList();
        }


        public async Task<List<Candle>> GetLastCandles(int tickerid, double period, int top)
        {
            /* try
             {
                 var ticker = tikrep.TickersById[tickerid].Securityid;
                 var res = await GetLastCandlesQuick(ticker, period, top);
                 if (!res.IsNullOrEmpty())
                 {
                     return res;
                 }
             }
             catch
             {
                 //return new List<BaseCandle>();
             }*/
            return await _dbContext.GetLastCandlesAsync(tickerid, (int)period, top);
        }


        static ConcurrentDictionary<SubsCandle, long> hash = new ConcurrentDictionary<SubsCandle, long>();

        static long canHash(List<Candle> c)
        {
            return (long)c.Sum(x => (x.Period.Ticks % 6666) * x.Volume);
        }

        public async Task<Dictionary<SubsCandle, List<Candle>>> CandlesQueryBatch(SubsCandle[] array, int count)
        {
            var startTime = DateTime.Now;


            var uri = apiPath + $"LastCandlesBatch?count={count}";
            using (var request = new HttpRequestMessage(new HttpMethod("POST"), uri))
            {
                request.Headers.TryAddWithoutValidation("accept", "text/plain");
                request.Content = new StringContent(JsonConvert.SerializeObject(array));
                request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");


                _logger.LogTrace($"Batch req {JsonConvert.SerializeObject(array)}  ");
                //var response =  httpClient.Send(request);

                using (var response = await client_.SendAsync(request))
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    Dictionary<string, List<Candle>> cp = JsonConvert.DeserializeObject<Dictionary<string, List<Candle>>>(responseBody);

                    var res = new Dictionary<SubsCandle, List<Candle>>();
                    foreach (var k in cp.Keys)
                    {

                        var k2 = SubsCandle.Parse(k);


                        // res[k2] = cp[k];


                        var hash1 = canHash(cp[k]);
                        long l;
                        var b = hash.TryGetValue(k2, out l);

                        if (!b || l != hash1)
                        {
                            res[k2] = cp[k];
                            hash[k2] = hash1;
                        }
                    }

                    var tks = string.Join(',', array.Select(x => x.ToString()));
                    _logger.LogTrace($"Batch {DateTime.Now - startTime}  {tks} ");
                    return res;
                }
            }

        }

        public async Task<List<Candle>> GetLastCandlesQuick(string ticker, double period, int top)
        {
            var startTime = DateTime.Now;


            //    client1.Timeout = TimeSpan.FromMilliseconds(100);
            var uri = apiPath + $"LastCandles/{ticker}?period={period}&count=3";
            using (var response = await client_.GetAsync(uri))
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                List<Candle> cp = JsonConvert.DeserializeObject<List<Candle>>(responseBody);
                _logger.LogTrace($"Last {DateTime.Now - startTime} url: {uri} len: {cp?.Count}");
                return cp;
            }

        }
        public async Task<object[][]> Seasonality(string ticker)
        {
            List<Candle> candles = await GetCandles(ticker, 30000, new DateTime(2000, 1, 1), new DateTime(2050, 1, 1), 40000);
            int minyear = candles[0].Period.Year;
            int maxyear = candles[candles.Count - 1].Period.Year;
            object[][] table = new object[maxyear - minyear + 3][];
            for (int i = 0; i < table.Length; i++)
                table[i] = new object[13];
            foreach (var v in candles)
            {
                var k = v;
                table[k.Period.Year - minyear + 1][1 + k.Period.Month - 1] = (decimal?)Math.Truncate((k.ClsPrice / k.OpnPrice - 1) * 10000);
            }
            for (int i = 1; i < table.Length; i++)
                table[i][0] = (i == table.Length - 1) ? "Среднее" : (minyear + i - 1).ToString();
            for (int i = 1; i < table[0].Length; i++)
            {
                table[0][i] = new DateTime(2011, i, 1).ToString("MMM", CultureInfo.GetCultureInfo("ru-RU"));
                decimal t = 0;
                int cnt = 0;
                for (int j = 1; j < table.Length - 1; j++)
                {
                    if (table[j][i] != null)
                    {
                        cnt++;
                        t += (decimal)table[j][i];
                    }
                }
                if (cnt > 0)
                    table[table.Length - 1][i] = (decimal?)Math.Truncate(t / cnt);
            }
            return table;
        }
    }
}
