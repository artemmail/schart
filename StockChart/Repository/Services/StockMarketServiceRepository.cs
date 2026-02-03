using StockChart.Model;
using Microsoft.EntityFrameworkCore;
using StockChart.Extentions;
using System.Linq.Dynamic.Core;
using System.Text.RegularExpressions;
namespace StockChart.Repository
{
    public class StockMarketServiceRepository : IStockMarketServiceRepository
    {
        private ApplicationDbContext _dbContext;
        private Func<CacheTech, ICacheService> _cacheService;
        ITickersRepository _dic;
        private readonly static CacheTech cacheTech = CacheTech.Memory;
        public StockMarketServiceRepository(ApplicationDbContext dbContext,
            Func<CacheTech, ICacheService> cacheService, ITickersRepository dic)
        {
            _dic = dic;
            _dbContext = dbContext;
            _cacheService = cacheService;
        }

        public async Task<object> TickerInfo(string ticker)
        {
            UpdateAlias(ref ticker);

            var info = _dic[ticker];

            var fullName = info.Fullname;
            var shortName = info.Securityid;
            var minStep = info.Minstep;
            var expriation = info.ToDate;

            var res = await _dbContext.DayCandles
                .Where(x => x.Id == info.Id)
                .OrderByDescending(x => x.Period)
                .Select(x => new { x.Period, x.ClsPrice, x.Oi, x.Volume })
                .Take(2)
                .ToArrayAsync();

            var lastPrice = res.Length > 0 ? res[0].ClsPrice : 0m;
            var oi = res.Length > 0 ? res[0].Oi : 0;
            var oiDelta = res.Length > 1 ? res[0].Oi - res[1].Oi : 0;
            var volume = res.Length > 0 ? res[0].Volume : 0m;

            var today = DateTime.Today;

            var futureSpec = await _dbContext.FutureSpecs
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.DictionaryId == info.Id);

            var assetCode = NormalizeCode(futureSpec?.AssetCode);

            var underlyingInfo = await ResolveUnderlyingAsync(info.Id, assetCode);
            var underlyingId = underlyingInfo?.Id;

            DateTime? spotLastDate = null;
            if (underlyingId.HasValue)
            {
                spotLastDate = await _dbContext.DayCandles
                    .Where(c => c.Id == underlyingId.Value)
                    .MaxAsync(c => (DateTime?)c.Period);
            }

            var series = await LoadFutureSeriesAsync(info, assetCode, today);
            var seriesResult = new List<object>();

            foreach (var item in series)
            {
                DateTime? futureLastDate = await _dbContext.DayCandles
                    .Where(c => c.Id == item.DictionaryId)
                    .MaxAsync(c => (DateTime?)c.Period);

                DateTime? valuationDate = null;
                if (futureLastDate.HasValue && spotLastDate.HasValue)
                {
                    valuationDate = futureLastDate.Value <= spotLastDate.Value ? futureLastDate.Value : spotLastDate.Value;
                }
                else if (futureLastDate.HasValue)
                {
                    valuationDate = futureLastDate.Value;
                }
                else if (spotLastDate.HasValue)
                {
                    valuationDate = spotLastDate.Value;
                }

                decimal? futurePrice = null;
                if (valuationDate.HasValue)
                {
                    futurePrice = await _dbContext.DayCandles
                        .Where(c => c.Id == item.DictionaryId && c.Period <= valuationDate.Value)
                        .OrderByDescending(c => c.Period)
                        .Select(c => (decimal?)c.ClsPrice)
                        .FirstOrDefaultAsync();
                }

                decimal? spotPrice = null;
                if (valuationDate.HasValue && underlyingId.HasValue)
                {
                    spotPrice = await _dbContext.DayCandles
                        .Where(c => c.Id == underlyingId.Value && c.Period <= valuationDate.Value)
                        .OrderByDescending(c => c.Period)
                        .Select(c => (decimal?)c.ClsPrice)
                        .FirstOrDefaultAsync();
                }

                decimal? spreadAbs = null;
                decimal? spreadPct = null;
                string? contango = null;
                if (futurePrice.HasValue && spotPrice.HasValue && spotPrice.Value != 0)
                {
                    spreadAbs = futurePrice.Value - spotPrice.Value;
                    spreadPct = spreadAbs.Value / spotPrice.Value;
                    contango = spreadAbs.Value > 0 ? "contango" : spreadAbs.Value < 0 ? "backwardation" : "flat";
                }

                int? daysToExpiration = null;
                decimal? impliedRate = null;
                if (valuationDate.HasValue && item.ExpirationDate.HasValue && futurePrice.HasValue && spotPrice.HasValue && spotPrice.Value != 0)
                {
                    var days = (item.ExpirationDate.Value.Date - valuationDate.Value.Date).TotalDays;
                    if (days > 0)
                    {
                        daysToExpiration = (int)days;
                        impliedRate = ((futurePrice.Value / spotPrice.Value) - 1m) * (360m / (decimal)days);
                    }
                }

                seriesResult.Add(new
                {
                    securityid = item.Securityid,
                    shortname = item.Shortname,
                    expirationDate = item.ExpirationDate,
                    lotSize = item.LotSize,
                    minStep = item.MinStep,
                    stepPrice = item.StepPrice,
                    futuresPrice = futurePrice,
                    spotPrice = spotPrice,
                    valuationDate = valuationDate,
                    spreadAbs = spreadAbs,
                    spreadPct = spreadPct,
                    contango = contango,
                    impliedRate = impliedRate,
                    daysToExpiration = daysToExpiration
                });
            }

            var options = new List<object>();
            var optionAssetCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(assetCode))
            {
                optionAssetCodes.Add(assetCode);
            }

            var baseCode = info.Securityid.Length >= 2 ? info.Securityid.Substring(0, 2) : info.Securityid;
            var normalizedBase = NormalizeCode(baseCode);
            if (!string.IsNullOrWhiteSpace(normalizedBase))
            {
                optionAssetCodes.Add(normalizedBase);
            }

            if (optionAssetCodes.Count > 0)
            {
                var optionRows = await (from o in _dbContext.OptionSpecs.AsNoTracking()
                                        join d in _dbContext.Dictionaries.AsNoTracking() on o.DictionaryId equals d.Id
                                        where optionAssetCodes.Contains(o.AssetCode!)
                                              && o.ExpirationDate.HasValue
                                              && o.ExpirationDate.Value >= today
                                        orderby o.ExpirationDate, o.Strike, o.OptionType
                                        select new
                                        {
                                            d.Securityid,
                                            d.Shortname,
                                            o.AssetCode,
                                            o.OptionType,
                                            o.Strike,
                                            o.TheorPrice,
                                            o.Volat,
                                            o.Last,
                                            o.Bid,
                                            o.Offer,
                                            o.VolToday,
                                            o.OpenPosition,
                                            o.UnderlyingPrice,
                                            o.ExpirationDate,
                                            o.LotSize,
                                            o.BoardId
                                        }).ToListAsync();

                if (optionRows.Count == 0 && !string.IsNullOrWhiteSpace(baseCode))
                {
                    optionRows = await (from o in _dbContext.OptionSpecs.AsNoTracking()
                                        join d in _dbContext.Dictionaries.AsNoTracking() on o.DictionaryId equals d.Id
                                        where d.Securityid.StartsWith(baseCode)
                                              && o.ExpirationDate.HasValue
                                              && o.ExpirationDate.Value >= today
                                        orderby o.ExpirationDate, o.Strike, o.OptionType
                                        select new
                                        {
                                            d.Securityid,
                                            d.Shortname,
                                            o.AssetCode,
                                            o.OptionType,
                                            o.Strike,
                                            o.TheorPrice,
                                            o.Volat,
                                            o.Last,
                                            o.Bid,
                                            o.Offer,
                                            o.VolToday,
                                            o.OpenPosition,
                                            o.UnderlyingPrice,
                                            o.ExpirationDate,
                                            o.LotSize,
                                            o.BoardId
                                        }).ToListAsync();
                }

                if (string.IsNullOrWhiteSpace(assetCode))
                {
                    var assetFromOptions = optionRows
                        .Where(o => !string.IsNullOrWhiteSpace(o.AssetCode))
                        .GroupBy(o => o.AssetCode!, StringComparer.OrdinalIgnoreCase)
                        .OrderByDescending(g => g.Count())
                        .Select(g => g.Key)
                        .FirstOrDefault();

                    if (!string.IsNullOrWhiteSpace(assetFromOptions))
                    {
                        assetCode = assetFromOptions;
                    }
                }

                options.AddRange(optionRows.Select(o => new
                {
                    securityid = o.Securityid,
                    shortname = o.Shortname,
                    optionType = o.OptionType,
                    strike = o.Strike,
                    theorPrice = o.TheorPrice,
                    volat = o.Volat,
                    last = o.Last,
                    bid = o.Bid,
                    offer = o.Offer,
                    volToday = o.VolToday,
                    openPosition = o.OpenPosition,
                    underlyingPrice = o.UnderlyingPrice,
                    expirationDate = o.ExpirationDate,
                    lotSize = o.LotSize,
                    boardId = o.BoardId
                }));
            }

            return new
            {
                fullName,
                shortName,
                minStep,
                expriation,
                lastPrice,
                volume,
                oi,
                oiDelta,
                assetCode,
                underlying = underlyingInfo == null
                    ? null
                    : new
                    {
                        securityid = underlyingInfo.Securityid,
                        shortname = underlyingInfo.Shortname,
                        fullname = underlyingInfo.Fullname
                    },
                another_futures = seriesResult.ToArray(),
                options
            };
        }

        private static string? NormalizeCode(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }
            return value.Trim().ToUpperInvariant();
        }

        private async Task<Dictionary?> ResolveUnderlyingAsync(int futureDictionaryId, string? assetCode)
        {
            Dictionary? stock = null;

            if (!string.IsNullOrWhiteSpace(assetCode))
            {
                var map = await _dbContext.UnderlyingMaps
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.AssetCode == assetCode);

                if (map != null)
                {
                    stock = await _dbContext.Dictionaries
                        .AsNoTracking()
                        .FirstOrDefaultAsync(d => d.Securityid == map.SpotSecId);
                }
            }

            if (stock != null)
            {
                return stock;
            }

            var link = await _dbContext.SecurityLinks
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.ToDictionaryId == futureDictionaryId && l.LinkType == 2);

            if (link == null)
            {
                return null;
            }

            return await _dbContext.Dictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == link.FromDictionaryId);
        }

        private async Task<List<FutureSeriesRow>> LoadFutureSeriesAsync(StockChart.Model.Dictionary info, string? assetCode, DateTime today)
        {
            if (!string.IsNullOrWhiteSpace(assetCode))
            {
                return await (from f in _dbContext.FutureSpecs.AsNoTracking()
                              join d in _dbContext.Dictionaries.AsNoTracking() on f.DictionaryId equals d.Id
                              where f.AssetCode == assetCode
                                    && f.ExpirationDate.HasValue
                                    && f.ExpirationDate.Value >= today
                              orderby f.ExpirationDate
                              select new FutureSeriesRow
                              {
                                  DictionaryId = d.Id,
                                  Securityid = d.Securityid,
                                  Shortname = d.Shortname,
                                  ExpirationDate = f.ExpirationDate,
                                  LotSize = f.LotSize,
                                  MinStep = f.MinStep,
                                  StepPrice = f.StepPrice
                              }).ToListAsync();
            }

            var code = info.Securityid.Length >= 2 ? info.Securityid.Substring(0, 2) : info.Securityid;
            return await (from f in _dbContext.FutureSpecs.AsNoTracking()
                          join d in _dbContext.Dictionaries.AsNoTracking() on f.DictionaryId equals d.Id
                          where d.Market == 1
                                && d.Securityid.StartsWith(code)
                                && f.ExpirationDate.HasValue
                                && f.ExpirationDate.Value >= today
                          orderby f.ExpirationDate
                          select new FutureSeriesRow
                          {
                              DictionaryId = d.Id,
                              Securityid = d.Securityid,
                              Shortname = d.Shortname,
                              ExpirationDate = f.ExpirationDate,
                              LotSize = f.LotSize,
                              MinStep = f.MinStep,
                              StepPrice = f.StepPrice
                          }).ToListAsync();
        }

        private sealed class FutureSeriesRow
        {
            public int DictionaryId { get; set; }
            public string Securityid { get; set; } = string.Empty;
            public string Shortname { get; set; } = string.Empty;
            public DateTime? ExpirationDate { get; set; }
            public int? LotSize { get; set; }
            public decimal? MinStep { get; set; }
            public decimal? StepPrice { get; set; }
        }

        public async Task<decimal> GetLastPriceAsync(string ticker, DateTime startdate, DateTime enddate)
        {
            var cacheKey = $"lastPrice_{ticker}_{startdate:yyyyMMddHHmmss}_{enddate:yyyyMMddHHmmss}";
            var cache = _cacheService(cacheTech);

            return await cache.GetOrAddAsync(cacheKey, async () =>
            {
                try
                {
                    if (ticker.Contains("##"))
                        ticker = ticker.Replace("##", "");

                    UpdateAlias(ref ticker);

                    //ticker = Alias(ticker);

                    var id = _dic[ticker].Id;
                    decimal res = await _dbContext.DayCandles
                        .Where(x => x.Id == id && x.Period >= startdate && x.Period <= enddate)
                        .OrderByDescending(x => x.Period)
                        .Select(x => x.ClsPrice)
                        .Take(1)
                        .SingleAsync();

                    return res;
                }
                catch
                (Exception ex)
                {
                    return 1;
                }
            }, TimeSpan.FromSeconds(1));
        }

        public async Task<decimal> GetLastPriceAsync(string ticker)
        {
            var cacheKey = $"lastPrice_{ticker}";
            var cache = _cacheService(cacheTech);

            return await cache.GetOrAddAsync(cacheKey, async () =>
            {
                try
                {

                    UpdateAlias(ref ticker);

                    var id = _dic[ticker].Id;
                    decimal res = await _dbContext.DayCandles
                        .OrderByDescending(x => x.Period)
                        .Where(x => x.Id == id)
                        .Select(x => x.ClsPrice)
                        .Take(1)
                        .SingleAsync();

                    return res;
                }
                catch
           (Exception ex)
                {
                    return 1;
                }
            }, TimeSpan.FromSeconds(1));
        }


        DateTime LastTradingDate(byte market)
        {
            return _dbContext.LastTradingDateProcAsync(market).Result.Single().period;
        }
        double rounder(double num)
        {
            var x = Math.Pow(10, Math.Round(Math.Log10(num)));
            return (2 * x - num < num - x) ? 2 * x : (num - 0.5 * x < x - num) ? x * 0.5 : x;
        }
        public decimal DefaultStep(string ticker, DateTime startDate, DateTime endDate)
        {
            decimal step = _dic[ticker].Minstep;
            int id = _dic[ticker].Id;
            decimal delta;
            if ((endDate - startDate < TimeSpan.FromDays(1)))
            {
                delta =
                   _dbContext.Candles.Where(x => x.Id == id && x.Period >= startDate && x.Period <= endDate)
                   .GroupBy(x => x.Id)
                   .Select(g => g.Max(gi => gi.MaxPrice) - g.Min(gi => gi.MinPrice)).FirstOrDefault();
            }
            else
            {
                delta =
                   _dbContext.DayCandles.Where(x => x.Id == id && x.Period >= startDate && x.Period <= endDate)
                   .GroupBy(x => x.Id)
                   .Select(g => g.Max(gi => gi.MaxPrice) - g.Min(gi => gi.MinPrice)).FirstOrDefault();
            }
            if (delta == 0)
            {
                delta = _dbContext.DayCandles
                    .Where(x => x.Id == id)
                    .OrderByDescending(x => x.Period).Select(x => x.ClsPrice).Take(1).Single();
            }
            if (step > 0)
            {
                int scale = (int)(delta / step / 100);
                scale = (int)rounder(scale);
                return (scale == 0) ? step : scale * step;
            }
            else
                return (decimal)rounder((double)delta / 100);
        }
        public string Alias(string ticker)
        {
            var cacheKey = $"Alias_{ticker}";
            if (!_cacheService(cacheTech).TryGet(cacheKey, out string? result))
            {
                result = _dbContext.AliasAsync(ticker).Result.SingleOrDefault()?.SECURITYID;
                _cacheService(cacheTech).Set(cacheKey, result);
            }
            return result;
        }
        public void UpdateAlias(ref string ticker)
        {
            if (string.IsNullOrEmpty(ticker))
                ticker = "Si";
            if (ticker.EndsWith("##"))
                ticker = ticker.Substring(0, 2);
            if (ticker.Length == 2)
            {
                ticker = Alias(ticker) ?? ticker;
            }
            else
            {
                Regex r = new Regex("[*\\-+\\/()]", RegexOptions.IgnoreCase);
                if (!r.Match(ticker).Success && _dic.Tickers.ContainsKey(ticker.ToUpper()))
                    ticker = _dic[ticker.ToUpper()].Securityid.Trim();
            }
        }
        public DateTime LastTradingDateCached(byte market)
        {
            var cacheKey = $"LastTradingDateCached{market}";
            if (!_cacheService(cacheTech).TryGet(cacheKey, out DateTime? result))
            {
                result = LastTradingDate(market);
                _cacheService(cacheTech).Set(cacheKey, result);
            }
            return result.Value;
        }
        public DateTimePair init_start_end_date(string? ticker, string rperiod, DateTime? startDate, DateTime? endDate, byte market)
        {
            if (startDate.HasValue && endDate.HasValue)
                return new DateTimePair(startDate.Value, endDate.Value);
            if (startDate.HasValue && !endDate.HasValue)
                return new DateTimePair(startDate.Value, new DateTime(2100, 1, 1));
            if (string.IsNullOrEmpty(rperiod) || rperiod == "custom")
                if (startDate.HasValue && endDate.HasValue)
                    return new DateTimePair(startDate.Value, endDate.Value);
                else
                    return new DateTimePair(DateTime.Now.Date - TimeSpan.FromDays(7), DateTime.Now.Date);
            return ListBoxes.DatesFromRperiod(ticker == null ? LastTradingDateCached(market) : LastTradingDateTickerCached(ticker), rperiod);
        }
        public DateTimePair getStartEndDateTime(string ticker, string? rperiod, string? startDate, string? endDate, string? from_stamp, string? startTime, string? endTime, bool timeEnable = false)
        {


            if (!string.IsNullOrEmpty(from_stamp))
            {
                return new DateTimePair(
                    long.Parse(from_stamp).DateTimeFromMinutes(),
                     DateTime.Now + TimeSpan.FromDays(7));
            }
            DateTimePair res;
            if (string.IsNullOrEmpty(rperiod))
                rperiod = "day";
            if (startDate == null || endDate == null)
                res = init_start_end_date(ticker, rperiod, null, null, 0);
            else
                res = new DateTimePair(startDate.parseDateTime(), endDate.parseDateTime());
            if (timeEnable && !string.IsNullOrEmpty(startTime) && !string.IsNullOrEmpty(endTime))
            {
                var sdt = DateTime.Parse(startTime).TimeOfDay;
                var edt = DateTime.Parse(endTime).TimeOfDay;
                res.Start += sdt;
                res.End += edt;
            }
            else
            {
                res.End += (TimeSpan.FromDays(1) - TimeSpan.FromMinutes(1));
            }
            return res;
        }

        public DateTimePair getStartEndDateTime(string ticker, string? rperiod, DateTime? startDate, DateTime? endDate)
        {
            if (string.IsNullOrEmpty(rperiod))
                rperiod = "day";
            if (startDate == null)
                return init_start_end_date(ticker, rperiod, null, null, 0);

            if (endDate == null)
                endDate = DateTime.Now.Date + TimeSpan.FromDays(1);

            return new DateTimePair() { Start = startDate.Value, End = endDate.Value };
        }


        public DateTime LastTradingDateTicker(string ticker)
        {
            if (!_dic.Tickers.ContainsKey(ticker))
            {
                Regex r = new Regex("[*\\-+\\/()]", RegexOptions.IgnoreCase);
                if (r.Match(ticker).Success)
                {
                    ticker = _dic.TickersFromFormula(ticker).First();
                    UpdateAlias(ref ticker);
                }
                else
                    UpdateAlias(ref ticker);
            }
            int i = _dic[ticker].Id;
            return _dbContext.DayCandles.Where(x => x.Id == i).OrderByDescending(x => x.Period).Select(x => x.Period).First();
        }
        public DateTime LastTradingDateTickerCached(string ticker)
        {
            var cacheKey = $"LastTradingDateTickerCached{ticker}";
            if (!_cacheService(cacheTech).TryGet(cacheKey, out DateTime? result))
            {
                result = LastTradingDateTicker(ticker);
                _cacheService(cacheTech).Set(cacheKey, result);
            }
            return result.Value;
        }



        public object[] Presets(string type, string ticker)
        {
            DateTime lastdate = LastTradingDateTicker(ticker);// (DateTime)SQLHelper.ScalarFromQuery("exec lastdateticker " + ticker);
            var res = new List<object>();
            foreach (var k in ListBoxes.ReportPeriods)
            {
                DateTimePair dates = ListBoxes.DatesFromRperiod(lastdate, k.Value);
                res.Add(new
                {
                    Text = k.Text,
                    Value = (new FootPrintRequestModel(k.Value, dates.Start.toDateTime(), dates.End.toDateTime(), ListBoxes.initPreferedPeriod(type, dates.End - dates.Start + TimeSpan.FromDays(1)), DefaultStep(ticker, dates.Start, dates.End + TimeSpan.FromDays(1))))
                }
                    );
            }
            return res.ToArray();
        }

        public FootPrintRequestModel[] PresetList(string type, string ticker)
        {
            DateTime lastdate = LastTradingDateTicker(ticker);// (DateTime)SQLHelper.ScalarFromQuery("exec lastdateticker " + ticker);
            var res = new List<FootPrintRequestModel>();
            foreach (var k in ListBoxes.ReportPeriods)
            {
                DateTimePair dates = ListBoxes.DatesFromRperiod(lastdate, k.Value);
                res.Add(
                        new FootPrintRequestModel(k.Value, dates.Start.toDateTime(), dates.End.toDateTime(), ListBoxes.initPreferedPeriod(type, dates.End - dates.Start + TimeSpan.FromDays(1)), DefaultStep(ticker, dates.Start, dates.End + TimeSpan.FromDays(1)))
                    );
            }
            return res.ToArray();
        }

        public class FootPrintRequestModel
        {
            public string rperiod { get; set; }
            public string startDate { get; set; }
            public string endDate { get; set; }
            public int period { get; set; }
            public decimal priceStep { get; set; }

            public FootPrintRequestModel(string rperiod, string startDate, string endDate, int period, decimal priceStep)
            {
                this.rperiod = rperiod;
                this.startDate = startDate;
                this.endDate = endDate;
                this.period = period;
                this.priceStep = priceStep;
            }
        }


        public class TickerPreset
        {
            public string type { get; }
            public string ticker { get; }
            public OptionsItems<double> periods { get; }
            public OptionsItems<string> rperiods { get; }
            public decimal period { get; }
            public string rperiod { get; }
            public DateTime startDate { get; }
            public DateTime endDate { get; }
            public bool timeEnable { get; }
            public string startTime { get; }
            public string endTime { get; }
            public decimal minStep { get; }
            public decimal? priceStep { get; }
            public FootPrintRequestModel[] presetList { get; }

            public TickerPreset(string type, string ticker, OptionsItems<double> periods, OptionsItems<string> rperiods, decimal period, string rperiod, DateTime startDate, DateTime endDate, bool timeEnable, string startTime, string endTime, decimal minStep, decimal? priceStep, FootPrintRequestModel[] presetList)
            {
                this.type = type;
                this.ticker = ticker;
                this.periods = periods;
                this.rperiods = rperiods;
                this.period = period;
                this.rperiod = rperiod;
                this.startDate = startDate;
                this.endDate = endDate;
                this.timeEnable = timeEnable;
                this.startTime = startTime;
                this.endTime = endTime;
                this.minStep = minStep;
                this.priceStep = priceStep;
                this.presetList = presetList;
            }
        }


        public class FootPrintInitParams
        {

            public string ticker { get; }
            public decimal period { get; }
            public string rperiod { get; }
            public DateTime startDate { get; }
            public DateTime endDate { get; }
            public decimal minStep { get; }
            public decimal priceStep { get; }
            public bool candlesOnly { get; set; }


            public FootPrintInitParams(string ticker, decimal period, string rperiod, DateTime startDate, DateTime endDate, decimal minStep, decimal priceStep, bool candlesOnly)
            {
                this.ticker = ticker;
                this.period = period;
                this.rperiod = rperiod;
                this.startDate = startDate;
                this.endDate = endDate;
                this.minStep = minStep;
                this.priceStep = priceStep;
                this.candlesOnly = candlesOnly;
            }
        }

        public TickerPreset CandlesParamsToObject(string ticker, decimal? priceStep, decimal? period, string rperiod, string startDate, string endDate,
             bool? timeEnable, string startTime, string endTime, bool? visualVolume, string type)
        {
            if (ticker == null)
                ticker = "GAZP";
            if (ticker.EndsWith("##"))
                ticker = ticker.Substring(0, 2);
            UpdateAlias(ref ticker);

            var tickerData = _dic[ticker];
            bool KeyExist = _dic.Tickers.ContainsKey(ticker.ToUpper());
            bool isCluster = true;// KeyExist ? _dic[ticker].iscluster : false;
            bool isFuture = tickerData.Market == 1;
            if (string.IsNullOrEmpty(rperiod) && !string.IsNullOrEmpty(startDate) && !string.IsNullOrEmpty(endDate))
                rperiod = "custom";
            var Dates = getStartEndDateTime(ticker, rperiod, startDate, endDate, null, startTime, endTime, timeEnable ?? false);
            var d = LastTradingDateTicker(ticker);
            DateTime lastdate = (d == null) ? (DateTime.Now.Date) : d;
            decimal minStep = KeyExist ? tickerData.Minstep : 0.0001m;
            priceStep = DefaultStep(ticker, Dates.Start, Dates.End);

            if (rperiod == null)
                rperiod = "day";

            if (period == null)
                period = 5;

            /*
            if (type == "Candles")
                return
                    new
                    {
                        type = type,
                        ticker = ticker,
                        periods = ListBoxes.CandlePeriods,
                        rperiods = ListBoxes.ReportPeriods,
                        period = ListBoxes.PeriodByDefault(rperiod, period),
                        rperiod = rperiod,
                        //    oiEnable = (oiEnable ?? false) && isFuture,
                        visualVolume = (visualVolume ?? false),
                        autoUpd = true,
                        startDate = Dates.Start.Date,
                        endDate = Dates.End.Date,
                        timeEnable = timeEnable ?? false,
                        startTime = startTime ?? "9:30",
                        endTime = endTime ?? "23:59",
                        minStep = minStep,
                        priceStep = priceStep,
                        presetList = PresetList(type, ticker),
                        isCluster = isCluster,
                        isFuture = isFuture
                    };
            else*/
            var candlesParamsToObject = new TickerPreset("Clusters", ticker, ListBoxes.CandlePeriods, ListBoxes.ReportPeriods, ListBoxes.PeriodByDefault(rperiod, period), rperiod, Dates.Start.Date, Dates.End.Date, timeEnable ?? false, startTime ?? "9:30", endTime ?? "23:59", minStep, priceStep, PresetList(type, ticker));
            return
                candlesParamsToObject;
        }

        public FootPrintInitParams CandlesParamsToObjectNew(string? ticker, decimal? priceStep, decimal? period, string? rperiod, DateTime? startDate, DateTime? endDate, string type)
        {
            if (ticker == null)
                ticker = "GAZP";
            if (ticker.EndsWith("##"))
                ticker = ticker.Substring(0, 2);
            UpdateAlias(ref ticker);

            var tickerData = _dic[ticker];
            bool KeyExist = _dic.Tickers.ContainsKey(ticker.ToUpper());
            bool isCluster = true;// KeyExist ? _dic[ticker].iscluster : false;
            bool isFuture = tickerData.Market == 1;
            if (string.IsNullOrEmpty(rperiod) && startDate.HasValue && endDate.HasValue)
                rperiod = "custom";
            var Dates = getStartEndDateTime(ticker, rperiod, startDate, endDate);
            var d = LastTradingDateTicker(ticker);
            DateTime lastdate = (d == null) ? (DateTime.Now.Date) : d;
            decimal minStep = KeyExist ? tickerData.Minstep : 0.0001m;


            if (rperiod == null)
                rperiod = "day";

            if (period == null)
                period = 5;


            bool timeEnable = (Dates.Start.Date != Dates.Start) || (Dates.End.Date != Dates.End);

            string startTime = "0:00";
            string endTime = "23:59";

            if (timeEnable)
            {
                // Если указано время для Start, заполняем startTime
                if (Dates.Start.Date != Dates.Start)
                {
                    startTime = Dates.Start.ToString("H:mm");
                }

                // Если указано время для End, заполняем endTime
                if (Dates.End.Date != Dates.End)
                {
                    endTime = Dates.End.ToString("H:mm");
                }
                if (priceStep == null)
                    priceStep = DefaultStep(ticker, Dates.Start, Dates.End);
            }
            else
            {
                if (priceStep == null)
                    priceStep = DefaultStep(ticker, Dates.Start, Dates.End + TimeSpan.FromDays(1));
            }

            var candlesParamsToObject = new FootPrintInitParams(
                    ticker,
                    period.Value,
                    rperiod,
                    Dates.Start,
                    Dates.End,
                    minStep,
                    priceStep.Value,
                    type == "Clusters"
                );

            return
                candlesParamsToObject;
        }
    }
}
