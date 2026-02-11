using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using StockChart.EventBus.Models;
using StockChart.Model;

namespace StockChart.Repository.Services
{
    public class ClusterRepository : IClusterRepository
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly ITickersRepository tikrep;
        private readonly IStockMarketServiceRepository stockMarketServiceRepository;
        private readonly string apiPath;
        private readonly HttpClient client1;

        public ClusterRepository(ApplicationDbContext dbContext, HttpClient client,
            ITickersRepository tikrep,
            IStockMarketServiceRepository stockMarketServiceRepository, IOptions<RecieverOptions> options)
        {
            client1 = client;
            apiPath = options.Value.apiPath + "/api/Candles/";
            this.stockMarketServiceRepository = stockMarketServiceRepository;
            this.tikrep = tikrep;
            _dbContext = dbContext;
        }

        public async Task<List<ClusterColumnWCF>> ClusterProfileQueryQuick(int id, decimal period, DateTimePair Dates, decimal step, bool Postmarket)
        {
            // client1.Timeout = TimeSpan.FromMilliseconds(300);
            var db = JsonConvert.SerializeObject(new DateTime(Dates.Start.Ticks)).Replace("\"", "");
            var de = JsonConvert.SerializeObject(new DateTime(Dates.End.Ticks)).Replace("\"", "");
            var ticker = tikrep.TickersById[id].Securityid;
            var uri = apiPath + $"ClusterProfileQuery/{ticker}?period={period.ToStringInvariant()}&startDate={db}&endDate={de}&step={step.ToStringInvariant()}";
            using (var response = await client1.GetAsync(uri))
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                var cp1 = JsonConvert.DeserializeObject<List<ClusterColumnWCF>>(responseBody);
                return cp1;
            }
        }

        public async Task<List<VolumeSearchResult>> VolumeSearch(string ticker, int period, DateTimePair dates, decimal priceStep)
        {
            stockMarketServiceRepository.UpdateAlias(ref ticker);
            return await _dbContext.VolumeSearchAsync(ticker, period, dates.Start, dates.End, priceStep);
        }

        private List<ClusterColumnWCF> Unite(List<ClusterProfileResult> clusters, List<Candle> camdles, decimal period)
        {
            var d = camdles.ToDictionary(x => x.Period.Floor((double)period), row => new ClusterColumnWCF()
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
            });

            foreach (var row in clusters)
            {
                var key = row.period.Floor((double)period);
                if (d.TryGetValue(key, out var column))
                {
                    column.cl.Add(
                        new cluster
                        {
                            p = row.price,
                            q = row.quantity,
                            bq = row.buyquantity,
                            mx = row.maxtrade,
                            ct = row.count
                        });
                }
            }

            return d.Values.OrderBy(x => x.x).ToList();
        }

        private static bool HasCandlesWithoutClusters(List<ClusterColumnWCF> columns)
        {
            return columns.Any(x => x.q > 0 && x.cl.Count == 0);
        }

        public async Task<List<ClusterColumnWCF>> GetLastCluster(int tickerid, decimal period, decimal step, int top)
        {
            List<Candle> candles = await _dbContext.GetLastCandlesAsync(tickerid, (int)period, top);

            if (candles.Count == 0)
                return new List<ClusterColumnWCF>();

            var dates = new DateTimePair(candles[0].Period, DateTime.Now + TimeSpan.FromDays(2));
            List<ClusterProfileResult> clusters = await _dbContext.ClusterProfileAsync(
                tickerid,
                (double)period,
                dates.Start,
                dates.End,
                step,
                1);
            return Unite(clusters, candles, period);
        }

        public async Task<List<ClusterColumnWCF>> ClusterProfileQuery(int id, byte market, decimal period, DateTimePair Dates, decimal step, bool Postmarket)
        {
            /*
            try
            {
                if (Dates.Start.Date == DateTime.Now.Date)
                {
                    var res = ClusterProfileQueryQuick(id, period, Dates, step, Postmarket).Result;
                    if (res != null && res.Any())
                    {
                        return res;
                    }
                }
            }
            catch (Exception ex)
            {
            }*/
            var list = new List<ClusterColumnWCF>();
            DateTime curDate = DateTime.MinValue;
            ClusterColumnWCF? col = null;

            if (period == 0)
            {
                foreach (var row in
                   _dbContext.ClusterProfileNewAsync(id, (int)period, Dates.Start, Dates.End, step, Postmarket ? (byte)1 : (byte)0))
                {
                    if (row.period != curDate)
                    {
                        if (col != null)
                            list.Add(col);

                        col = new ClusterColumnWCF()
                        {
                            x = row.period,
                            o = row.opnprice,
                            c = row.clsprice,
                            l = row.minprice,
                            h = row.maxprice,
                            oi = row.oi,
                            q = 0,
                            bq = 0
                        };

                        curDate = row.period;
                    }
                    col!.cl.Add(
                        new cluster
                        {
                            p = row.price,
                            q = row.quantity,
                            bq = row.buyquantity,
                            mx = row.maxtrade,
                            ct = row.count
                        });

                    col.q += row.quantity;
                    col.bq += row.buyquantity;
                }
                if (col != null)
                    list.Add(col);
                return list;
            }

            try
            {
                List<Candle> candles = await _dbContext.GetCandlesIdAsync(id, market, (double)period, Dates.Start, Dates.End, 10000);
                if (candles.Count == 0)
                    return new List<ClusterColumnWCF>();

                if (period > 0 && period == decimal.Truncate(period))
                {
                    var localClusters = await _dbContext.ClusterProfileFromClusterSqlLocalEfAsync(
                        id,
                        (int)period,
                        Dates.Start,
                        Dates.End,
                        step,
                        candles);

                    var localColumns = Unite(localClusters, candles, period);
                    if (!HasCandlesWithoutClusters(localColumns))
                        return localColumns;
                }

                List<ClusterProfileResult> clusters = await _dbContext.ClusterProfileAsync(
                    id,
                    (double)period,
                    Dates.Start,
                    Dates.End,
                    step,
                    Postmarket ? (byte)1 : (byte)0);

                return Unite(clusters, candles, period);
            }
            catch
            {
                return null;
            }
        }
    }
}
