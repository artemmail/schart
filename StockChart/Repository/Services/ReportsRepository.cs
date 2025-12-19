using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NLog.Time;
using StockChart.Extentions;
using StockChart.Model;
using StockProject.MemCache;
using System.Linq;
using static StockProcContext;

namespace StockChart.Repository
{



    public class ReportsRepository : IReportsRepository
    {
        private sealed record DailyVolumeRow(int Id, DateOnly Day, decimal Volume);

        private readonly StockProcContext _dbContext;
        private readonly Func<CacheTech, ICacheService> _cacheService;
        private readonly ITickersRepository _tickerRepository;
        private readonly IStockMarketServiceRepository _marketServiceRepository;
        private readonly IMemoryCache _cache;
        private const CacheTech cacheTech = CacheTech.Memory;

        public ReportsRepository(
            StockProcContext dbContext,
            IStockMarketServiceRepository marketServiceRepository,
            Func<CacheTech, ICacheService> cacheService,
            ITickersRepository tickerRepository,
            IMemoryCache cache)
        {
            _dbContext = dbContext;
            _marketServiceRepository = marketServiceRepository;
            _cacheService = cacheService;
            _tickerRepository = tickerRepository;
            _cache = cache;
        }

        public async Task<List<TopOrdersResult>> TopOrders(string ticker, int bigPeriod)
        {
            return await _dbContext.TopOrdersAsync(ticker, bigPeriod);
        }

        public async Task<List<TopOrdersResult>> TopOrdersPeriod(string ticker, DateTime startDate, DateTime endDate, int topN = 200)
        {
            return await _dbContext.TopOrdersPeriodAsync(ticker, startDate, endDate, topN);
        }

        public async Task<List<candleseekerResult>> VolumeSplash(int bigPeriod, int smallPeriod, float splash = 3, byte market = 0)
        {
            return await _dbContext.VolumeSplashAsync(bigPeriod, smallPeriod, market, splash);
        }

        public async Task<List<MarketMapPeriod4Result>> MarketLeaders(DateTime startDate, DateTime endDate, int top, byte market, int dir)
        {
            endDate = endDate.AddDays(1).AddSeconds(-1);
            var map = await _dbContext.MarketMapPeriod4Async(startDate, endDate, market);

            var query = map.AsQueryable();

            switch (dir)
            {
                case 0:
                    query = query.OrderByDescending(x => x.Volume);
                    break;
                case 1:
                    query = query.OrderByDescending(x => x.Cls / x.Opn);
                    break;
                default:
                    query = query.OrderBy(x => x.Cls / x.Opn);
                    break;
            }

            return query.Take(top).ToList();
        }

        public async Task<List<MicexVolYearResult>> MarketCandlesVolume(int year, int year2, byte market, int group)
        {
            var startDate = new DateTime(year, 1, 1);
            var endDate = new DateTime(year2 + 1, 1, 1);

            var data = await _dbContext.DayCandles
                .Join(_dbContext.Dictionaries, s => s.Id, sa => sa.Id, (s, sa) => new { s.Period, s.Volume, s.BuyVolume, sa.Market })
                .Where(x => x.Market == market && x.Period >= startDate && x.Period < endDate)
                .GroupBy(x => x.Period)
                .Select(g => new MicexVolYearResult
                {
                    Date = g.Key,
                    Volume = g.Sum(y => y.Volume) / 1_000_000_000,
                    BuyVolume = g.Sum(y => y.BuyVolume) / 1_000_000_000,
                })
                .OrderBy(x => x.Date)
                .ToListAsync();

            return data.GroupBy(l => l.Date.Group(group))
                       .Select(g => new MicexVolYearResult
                       {
                           Date = g.Min(z => z.Date),
                           Volume = g.Sum(z => z.Volume),
                           BuyVolume = g.Sum(z => z.BuyVolume),
                       })
                       .ToList();
        }

        private async Task<T> GetOrAddCacheAsync<T>(string cacheKey, Func<Task<T>> factory, TimeSpan cacheDuration)
        {
            return await _cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = cacheDuration;
                return await factory();
            });
        }

        public async Task<List<Barometer>> BarometerRTS(DateTimePair dates)
        {
            var ids = new Dictionary<string, string>
            {
                { "RI##", "Склееный фьючерс индекс РТС" },
                { "MX##", "Склееный фьючерс индекс Мосбиржи" },
                { "Si##", "Склееный фьючерс рубль-доллар" },
                { "Eu##", "Склееный фьючерс рубль-евро" },
                { "CR##", "Склееный фьючерс рубль-юань" },
                { "ED##", "Склееный фьючерс доллар-евро" },
                { "GD##", "Склееный фьючерс золото" },
                { "SV##", "Склееный фьючерс серебро" },
                { "BR##", "Склееный фьючерс нефть BRENT" },
                { "NG##", "Склееный фьючерс натуральный газ" }
            };

            return await CreateBarometers(ids, dates, isRTS: true);
        }

        /// <summary>
        /// Дашборд по объёмам для заданного рынка.
        /// today – дата текущей торговой сессии (локальная для биржи).
        /// </summary>
        public async Task<IReadOnlyList<VolumeDashboardRow>> GetVolumeDashboardAsync(
            byte market,
            DateOnly today)
        {
            // последние 365 календарных дней (≈ 1 биржевой год)
            var from = today.AddDays(-364).ToDateTime(TimeOnly.MinValue);
            var to = today.ToDateTime(TimeOnly.MaxValue);

            var candles = await _dbContext.DayCandles
                .Where(c => c.IdNavigation.Market == market &&
                            c.Period >= from && c.Period <= to)
                .Select(c => new
                {
                    c.Id,
                    Day = DateOnly.FromDateTime(c.Period),
                    c.Volume
                })
                .OrderBy(x=>x.Id)
                .ThenBy(x=>x.Day)
                .ToListAsync();

            // суточный объём каждой бумаги
            var dailyBySec = candles
                .GroupBy(x => new { x.Id, x.Day })
                .Select(g => new DailyVolumeRow(
                    g.Key.Id,
                    g.Key.Day,
                    g.Sum(v => v.Volume)))
                .ToList();

            // <Id, отсортированный список DailyVolumeRow>
            var perSec = dailyBySec
                .GroupBy(r => r.Id)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(r => r.Day).ToList());

            // локальная функция для среднего по N предыдущим торговым датам
            decimal Avg(IReadOnlyList<DailyVolumeRow> rows, int n) =>
                rows
                   .Where(r => r.Day < today && r.Day.DayOfWeek!= DayOfWeek.Sunday && r.Day.DayOfWeek != DayOfWeek.Saturday)  // исключаем текущий день
                   .Take(n)
                   .Select(r => r.Volume)
                   .DefaultIfEmpty(0m)
                   .Average();

            var result = new List<VolumeDashboardRow>(perSec.Count);

            foreach (var (id, rows) in perSec)
            {
                var t = _tickerRepository.TickersById[id];   // Securityid / Shortname

                //var v1 = rows.First()?.Volume ?? 0m;
                 var v2 = rows.FirstOrDefault(r => r.Day == today)?.Volume ?? 0m;

                // if (v1>0)
                if (today.ToDateTime(TimeOnly.MinValue) - rows.Max(x => x.Day).ToDateTime(TimeOnly.MinValue) < TimeSpan.FromDays(5))
                result.Add(new VolumeDashboardRow(
                    t.Shortname,
                    t.Securityid,
                    v2,
                    Avg(rows, 3),
                    Avg(rows, 7),
                    Avg(rows, 30),
                    Avg(rows, 90),
                    Avg(rows, 180),
                    Avg(rows, 365)));
            }

            return result;
        }

        public async Task<List<Barometer>> Barometer(byte market, DateTimePair dates)
        {
            if (market == 1)
                return await BarometerRTS(dates);

            var ids = await _dbContext.DayCandles
                .Join(_dbContext.Dictionaries, s => s.Id, sa => sa.Id, (s, sa) => new { s.Id, s.Period, s.Volume, sa.Market })
                .Where(x => x.Market == market && x.Period >= dates.Start && x.Period < dates.End)
                .GroupBy(x => x.Id)
                .OrderByDescending(g => g.Sum(y => y.Volume))
                .Select(g => g.Key)
                .Take(20)
                .ToListAsync();

            var idDict = ids.ToDictionary(id => _tickerRepository.TickersById[id].Securityid, id => _tickerRepository.TickersById[id].Shortname);

            return await CreateBarometers(idDict, dates, isRTS: false);
        }

        private async Task<List<Barometer>> CreateBarometers(Dictionary<string, string> ids, DateTimePair dates, bool isRTS)
        {
            var res = new List<Barometer>();

            foreach (var kvp in ids)
            {
                string tick = kvp.Key;
                string name = kvp.Value;

                string ticker = isRTS ? tick : _tickerRepository.TickersById.FirstOrDefault(x => x.Value.Securityid == tick).Value.Securityid;
                string tickerName = isRTS ? $"{tick} ({name})" : name;

                var rec1 = await GetCachedRecommendation(tick, ticker, 60, dates);
                var rec2 = await GetCachedRecommendation(tick, ticker, 1440, dates);
                var rec3 = await GetCachedRecommendation(tick, ticker, 10080, dates); // 1440 * 7
                var opn = await _marketServiceRepository.GetLastPriceAsync(tick);

                res.Add(new Barometer
                {
                    ticker = tick,
                    tickerName = tickerName,
                    rec1 = rec1,
                    rec2 = rec2,
                    rec3 = rec3,
                    opn = opn
                });
            }
            return res;
        }


        private async Task<List<Candle>> GetCandles(string tick, string ticker, int period, DateTimePair dates)
        {
            return tick.EndsWith("##")
                ? await _dbContext.GetCandlesGluedAsync(ticker, period, dates.Start, dates.End, 43)
                : await _dbContext.GetCandlesAsync(ticker, period, dates.Start, dates.End, 43);
        }

        private async Task<int> GetCachedRecommendation(string tick, string ticker, int period, DateTimePair dates)
        {
            var cacheKey = $"rec_{tick}_{period}";
            return await GetOrAddCacheAsync(cacheKey, async () =>
            {
                var candles = await GetCandles(tick, ticker, period, dates);
                var barometerCalculator = new BarometerCalculator();
                return barometerCalculator.RecommendationInt(candles);
            }, TimeSpan.FromMinutes(15));
        }

        public async Task<List<ReportLeader>> MarketLeadersRep(DateTime startDate, DateTime endDate, int top, byte market, int dir, int colorModel = 0)
        {
            var map = await MarketLeaders(startDate, endDate, top, market, dir);
            var avTake = 5;

            var logReturns = map.Where(x => x.Cls > 0 && x.Opn > 0)
                                .Select(s => Math.Log((double)s.Cls / (double)s.Opn))
                                .ToArray();

            var minAvg = logReturns.OrderBy(x => x).Take(avTake).Average();
            var maxAvg = logReturns.OrderByDescending(x => x).Take(avTake).Average();
            var maxAbs = Math.Max(Math.Abs(minAvg), Math.Abs(maxAvg));

            return map.Where(x => x.Cls > 0 && x.Opn > 0 && x.Volume > 0 && _tickerRepository.TickersById.ContainsKey(x.Id))
                      .Select(t => new ReportLeader
                      {
                          ticker = _tickerRepository.TickersById[t.Id].Securityid,
                          name = _tickerRepository.TickersById[t.Id].Shortname,
                          opn = t.Opn,
                          cls = t.Cls,
                          percent = Math.Round(10000 * (t.Cls / t.Opn - 1)) / 100,
                          volume = t.Volume,
                          bid = Math.Round(10000 * (t.BuyVolume / t.Volume)) / 100,
                          color = Gradient.GradientColorY((decimal)maxAbs, t.Opn > 0 ? (decimal)Math.Log((double)t.Cls / (double)t.Opn) : 1, colorModel)
                      })
                      .ToList();
        }

        public async Task<List<MarketMapItem>> MarketMap(DateTime startDate, DateTime endDate, int top, byte market, HashSet<int> catIds)
        {
            bool haveCategories = market == 0 && catIds.Any();
            int fetchLimit = haveCategories ? 2000 : top;

            var leaders = await MarketLeadersRep(startDate, endDate, fetchLimit, market, 0, 1);

            if (haveCategories)
            {
                leaders = leaders.Where(x => _tickerRepository[x.ticker].CategoryTypeId.HasValue && catIds.Contains(_tickerRepository[x.ticker].CategoryTypeId.Value))
                                 .Take(top)
                                 .ToList();
            }

            bool isUnsorted = !_tickerRepository.MarketById[market].Structed;
            string marketName = _tickerRepository.MarketById[market].Name;

            string GetCategoryName(string ticker)
            {
                return isUnsorted ? marketName : _tickerRepository[ticker].CategoryType?.Name ?? "Unstructured";
            }

            return leaders.GroupBy(x => GetCategoryName(x.ticker))
                          .Select(g => new MarketMapItem(
                              g.Key,
                              g.Sum(x => x.volume),
                              g.Select(t => new MarketMapSquare(
                                  t.color,
                                  t.ticker,
                                  $"{t.name} {t.percent}%",
                                  t.name,
                                  t.volume,
                                  t.bid,
                                  t.cls,
                                  t.percent))))
                          .ToList();
        }

        public class MarketMapSquare
        {
            public string color { get; }
            public string ticker { get; }
            public string name { get; }
            public string name1 { get; }
            public decimal value { get; }
            public decimal bid { get; }
            public decimal cls { get; }
            public decimal percent { get; }

            public MarketMapSquare(string color, string ticker, string name, string name1, decimal value, decimal bid, decimal cls, decimal percent)
            {
                this.color = color;
                this.ticker = ticker;
                this.name = name;
                this.name1 = name1;
                this.value = value;
                this.bid = bid;
                this.cls = cls;
                this.percent = percent;
            }
        }

        public class MarketMapItem
        {
            public string name { get; }
            public decimal value { get; }
            public IEnumerable<MarketMapSquare> items { get; }

            public MarketMapItem(string name, decimal value, IEnumerable<MarketMapSquare> items)
            {
                this.name = name;
                this.value = value;
                this.items = items;
            }
        }
    }
}
