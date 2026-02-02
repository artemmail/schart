using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.EventBus.Models;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Services;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClustersController : Controller
    {
        private readonly ICandlesRepository _candlesRepository;
        private readonly IClusterRepository _clusterRepository;
        private readonly IStockMarketServiceRepository _stockMarketServiceRepository;
        private readonly ITickersRepository _tickersRepository;
        private readonly IReportsRepository _reports;
        private readonly ICandlesRepositorySet _candlesRepositorySet;
        private readonly IUsersRepository _usersRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _dbContext;

        public ClustersController(
            ICandlesRepository candlesRepository,
            ICandlesRepositorySet candlesRepositorySet,
            ITickersRepository tickers,
            IReportsRepository reports,
            IClusterRepository clusterRepository,
            UserManager<ApplicationUser> userManager,
            IUsersRepository usersRepository,
            ApplicationDbContext dbContext,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _usersRepository = usersRepository;
            _candlesRepositorySet = candlesRepositorySet;
            _clusterRepository = clusterRepository;
            _tickersRepository = tickers;
            _reports = reports;
            _candlesRepository = candlesRepository;
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }

        [HttpGet]
        [Route("volumeSearch")]
        public async Task<List<VolumeSearchResult>> VolumeSearch(string? login, string? ticker, int period, string? rperiod,
            string? startDate, string? endDate, bool? timeEnable, string? startTime, string? endTime, decimal priceStep, string? from_stamp, bool? Postmarket)
        {
            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            var dates = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, from_stamp, startTime, endTime, timeEnable ?? false);
            return await _clusterRepository.VolumeSearch(ticker, period, dates, priceStep);
        }

        [HttpGet]
        [Route("volumeSearch2")]
        public async Task<List<VolumeSearchResult>> VolumeSearch2(string ticker, int period, decimal priceStep, DateTime? startDate, DateTime? endDate)
        {
            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            var dates = new DateTimePair(startDate, endDate);
            return await _clusterRepository.VolumeSearch(ticker, period, dates, priceStep);
        }

        [HttpGet]
        [Route("getRangeOld")]
        [Authorize]
        public async Task<IActionResult> GetRangeOld(string? login, string? ticker, decimal period, string? rperiod,
           string? startDate, string? endDate, bool? timeEnable, string? startTime, string? endTime, decimal priceStep, DateTime? from_stamp, bool? Postmarket)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            _stockMarketServiceRepository.UpdateAlias(ref ticker);

            var authorizationResult = await CheckUserAuthorization(ticker, period, false, from_stamp != null);
            if (authorizationResult != null)
            {
                return authorizationResult;
            }

            string fromStampStr = from_stamp?.ToJavaScriptMinutes().ToString();
            var dates = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, fromStampStr, startTime, endTime, timeEnable ?? false);

            var clusterData = await _clusterRepository.ClusterProfileQuery(_tickersRepository[ticker].Id, _tickersRepository[ticker].Market.Value, period, dates, priceStep, false);

            return Ok(new
            {
                priceScale = priceStep,
                VolumePerQuantity = 1,
                clusterData
            });
        }

        [HttpGet]
        [Route("getTicks")]
        public async Task<IActionResult> GetTicks(string? login, string ticker, DateTime startDate, DateTime? endDate)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            _stockMarketServiceRepository.UpdateAlias(ref ticker);

            var authorizationResult = await CheckUserAuthorization(ticker, 0, false);
            if (authorizationResult != null)
            {
                return authorizationResult;
            }

            var dates = new DateTimePair(startDate, endDate);

            if (dates.Start.Date != DateTime.Now.Date && (dates.End - dates.Start).TotalDays > 1)
            {
                return StatusCode(403, "Тиковый график доступен только по запросу внутри дня");
            }

            var ticks = await _candlesRepository.GetTicks(ticker, dates.Start, dates.End);
            return Ok(ticks);
        }

        [HttpGet]
        [Route("getRange")]
        public async Task<IActionResult> GetRange(string? ticker, decimal period, decimal priceStep,
            DateTime? startDate, DateTime? endDate, bool candlesOnly = false)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(ticker))
                {
                    return BadRequest("Ticker is required.");
                }

                bool glued = false;
                if (ticker.Length == 4 && ticker.Contains("##"))
                {
                    candlesOnly = true;
                    ticker = ticker.Substring(0, 2);
                    glued = true;
                }
                else
                    _stockMarketServiceRepository.UpdateAlias(ref ticker);

                if (IsFormulaTicker(ticker))
                {
                    if (!string.IsNullOrEmpty(ticker))
                    {
                        ticker = _tickersRepository.CorrectFormula(ticker);
                    }

                    if (startDate == null)
                    {
                        startDate = GetDefaultStartDate("GAZP", period);
                    }

                    var dates1 = GetDateTimePair(startDate, endDate, period);

                    var baseCandles = await _candlesRepositorySet.GetRangeSetBase(ticker, null, null, (double)period, dates1, 1000);

                    return Ok(new
                    {
                        priceScale = priceStep,
                        VolumePerQuantity = 1,
                        clusterData = baseCandles
                    });

                }

                if (startDate == null)
                {
                    startDate = GetDefaultStartDate(ticker, period);
                }

                var authorizationResult = await CheckUserAuthorization(ticker, period, candlesOnly);
                if (authorizationResult != null)
                {
                    return authorizationResult;
                }

                var dates = GetDateTimePair(startDate, endDate, period);

                if (period == 0)
                {
                    if (dates.Start.Date != DateTime.Now.Date && (dates.End - dates.Start).TotalDays > 1)
                    {
                        return StatusCode(403, "Тиковый график доступен только по запросу внутри дня");
                    }

                    var ticks = await _candlesRepository.GetTicks(ticker, dates.Start, dates.End);
                    return Ok(new
                    {
                        priceScale = priceStep,
                        VolumePerQuantity = 1,
                        clusterData = ticks
                    });
                }

                var clusterResult = await GetClusterData(ticker, period, priceStep, dates, candlesOnly, glued);
                if (clusterResult is IActionResult actionResult)
                {
                    return actionResult;
                }

                return Ok(clusterResult);
            }
            catch (Exception ex)
            {
                return BadRequest( ex.Message);
            }
        }

        [HttpGet]
        [Route("candlesSeries")]
        public async Task<IActionResult> GetCandlesSeries(
            string? ticker,
            decimal period,
            DateTime? startDate,
            DateTime? endDate,
            int limit = 500,
            string? fields = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(ticker))
                {
                    return BadRequest(new ApiErrorResponseDto
                    {
                        Error = new ApiErrorDto
                        {
                            Code = "VALIDATION_ERROR",
                            Message = "ticker is required",
                            Details = new { }
                        }
                    });
                }

                if (period <= 0)
                {
                    return BadRequest(new ApiErrorResponseDto
                    {
                        Error = new ApiErrorDto
                        {
                            Code = "VALIDATION_ERROR",
                            Message = "period must be > 0 (minutes).",
                            Details = new { }
                        }
                    });
                }

                const int maxLimit = 5000;
                limit = Math.Clamp(limit, 1, maxLimit);

                bool glued = false;
                if (ticker.Length == 4 && ticker.Contains("##"))
                {
                    ticker = ticker.Substring(0, 2);
                    glued = true;
                }
                else
                {
                    _stockMarketServiceRepository.UpdateAlias(ref ticker);
                }

                if (startDate == null)
                {
                    startDate = GetDefaultStartDate(ticker, period);
                }

                var dates = GetDateTimePair(startDate, endDate, period);

                var selectedFields = ParseCandleFields(fields);
                if (selectedFields.Error != null)
                {
                    return BadRequest(selectedFields.Error);
                }

                int fetchTop = Math.Min(maxLimit + 1, limit + 1);

                List<ClusterColumnBase> candles;
                if (period == 3)
                {
                    candles = await _candlesRepository.GetTradesCandles(ticker, dates.Start, dates.End) ?? new List<ClusterColumnBase>();
                }
                else if (glued)
                {
                    candles = await _candlesRepository.GetCandlesGlued1(ticker + "##", (int)period, dates.Start, dates.End, fetchTop) ?? new List<ClusterColumnBase>();
                }
                else if (IsFormulaTicker(ticker))
                {
                    ticker = _tickersRepository.CorrectFormula(ticker);
                    candles = await _candlesRepositorySet.GetRangeSetBase(ticker, null, null, (double)period, dates, fetchTop) ?? new List<ClusterColumnBase>();
                }
                else
                {
                    var raw = await _candlesRepository.GetCandles(ticker, (double)period, dates.Start, dates.End, fetchTop) ?? new List<Candle>();
                    candles = raw.Select(row => new ClusterColumnBase
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
                }

                bool truncated = false;
                if (candles.Count > limit)
                {
                    truncated = true;
                    candles = candles.Take(limit).ToList();
                }

                var data = new object?[candles.Count][];
                for (int i = 0; i < candles.Count; i++)
                {
                    var c = candles[i];
                    var row = new object?[selectedFields.Fields.Length];
                    for (int j = 0; j < selectedFields.Fields.Length; j++)
                    {
                        row[j] = selectedFields.Fields[j] switch
                        {
                            "t" => c.x.ToString("yyyy-MM-ddTHH:mm:ss"),
                            "o" => c.o,
                            "h" => c.h,
                            "l" => c.l,
                            "c" => c.c,
                            "q" => c.q,
                            "v" => c.v,
                            "bq" => c.bq,
                            "bv" => c.bv,
                            "sq" => c.q - c.bq,
                            "sv" => c.v - c.bv,
                            "oi" => c.oi,
                            _ => null
                        };
                    }
                    data[i] = row;
                }

                var response = new CandleSeriesResponseDto
                {
                    Ticker = ticker,
                    Period = period,
                    Start = dates.Start.ToString("yyyy-MM-ddTHH:mm:ss"),
                    End = dates.End.ToString("yyyy-MM-ddTHH:mm:ss"),
                    Fields = selectedFields.Fields,
                    Data = data,
                    Meta = new ApiMetaDto
                    {
                        RequestId = HttpContext.TraceIdentifier ?? string.Empty,
                        RowsReturned = data.Length,
                        RowsTotal = null,
                        Truncated = truncated,
                        NextCursor = null,
                        ServerTimeUtc = DateTime.UtcNow.ToString("O"),
                        Source = new[] { "candles" }
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiErrorResponseDto
                {
                    Error = new ApiErrorDto
                    {
                        Code = "INTERNAL_ERROR",
                        Message = ex.Message,
                        Details = new { exceptionType = ex.GetType().Name }
                    }
                });
            }
        }

        private sealed class CandleFieldsParseResult
        {
            public string[] Fields { get; init; } = Array.Empty<string>();
            public ApiErrorResponseDto? Error { get; init; }
        }

        private static CandleFieldsParseResult ParseCandleFields(string? fields)
        {
            var requested = new List<string>();

            if (!string.IsNullOrWhiteSpace(fields))
            {
                foreach (var raw in fields.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    var token = raw.ToLowerInvariant();
                    if (string.IsNullOrWhiteSpace(token))
                    {
                        continue;
                    }

                    switch (token)
                    {
                        case "base":
                            requested.AddRange(new[] { "t", "c" });
                            break;
                        case "ohlc":
                            requested.AddRange(new[] { "t", "o", "h", "l", "c" });
                            break;
                        case "vol":
                        case "volume":
                            requested.Add("v");
                            break;
                        case "qty":
                        case "quantity":
                            requested.Add("q");
                            break;
                        case "bidask":
                        case "askbid":
                            requested.AddRange(new[] { "bq", "sq", "bv", "sv" });
                            break;
                        case "oi":
                            requested.Add("oi");
                            break;
                        case "t":
                        case "time":
                        case "date":
                        case "datetime":
                            requested.Add("t");
                            break;
                        case "o":
                        case "open":
                            requested.Add("o");
                            break;
                        case "h":
                        case "high":
                            requested.Add("h");
                            break;
                        case "l":
                        case "low":
                            requested.Add("l");
                            break;
                        case "c":
                        case "close":
                            requested.Add("c");
                            break;
                        case "v":
                            requested.Add("v");
                            break;
                        case "q":
                            requested.Add("q");
                            break;
                        case "bq":
                        case "bidq":
                        case "buyq":
                        case "buyqty":
                        case "buyquantity":
                            requested.Add("bq");
                            break;
                        case "bv":
                        case "bidv":
                        case "buyv":
                        case "buyvol":
                        case "buyvolume":
                            requested.Add("bv");
                            break;
                        case "sq":
                        case "askq":
                        case "sellq":
                        case "sellqty":
                        case "sellquantity":
                            requested.Add("sq");
                            break;
                        case "sv":
                        case "askv":
                        case "sellv":
                        case "sellvol":
                        case "sellvolume":
                            requested.Add("sv");
                            break;
                        case "all":
                            requested.AddRange(new[] { "t", "o", "h", "l", "c", "q", "bq", "sq", "v", "bv", "sv", "oi" });
                            break;
                        default:
                            return new CandleFieldsParseResult
                            {
                                Error = new ApiErrorResponseDto
                                {
                                    Error = new ApiErrorDto
                                    {
                                        Code = "VALIDATION_ERROR",
                                        Message = $"Unknown field token: {raw}",
                                        Details = new
                                        {
                                            allowed = new[]
                                            {
                                                "base", "ohlc", "vol", "qty", "bidask", "oi", "all",
                                                "t", "o", "h", "l", "c", "q", "v", "bq", "bv", "sq", "sv", "oi"
                                            }
                                        }
                                    }
                                }
                            };
                    }
                }
            }

            if (requested.Count == 0)
            {
                requested.AddRange(new[] { "t", "c" });
            }

            if (!requested.Contains("t"))
            {
                requested.Insert(0, "t");
            }

            var seen = new HashSet<string>(StringComparer.Ordinal);
            var unique = new List<string>();
            foreach (var f in requested)
            {
                if (seen.Add(f))
                {
                    unique.Add(f);
                }
            }

            return new CandleFieldsParseResult { Fields = unique.ToArray() };
        }

        private async Task<IActionResult?> CheckUserAuthorization(string ticker, decimal period, bool candlesOnly, bool isFromStamp = false)
        {
            if ((period == 0 || !candlesOnly) && ticker != "GAZP" && !isFromStamp)
            {
                var market = _tickersRepository[ticker].Market ?? 0;
                int service = market switch
                {
                    < 10 => 1,
                    20 => 3,
                    _ => 2
                };

                var applicationUser = await _userManager.GetUserAsync(User);
                if (!_usersRepository.IsPayed(applicationUser, service))
                {
                    var message = service switch
                    {
                        2 => "Для использования западных рынков необходима отдельная подписка по <a href=\"/Payment\">ссылке</a>",
                        3 => "Для доступа к криптобиржам необходима отдельная подписка по <a href=\"/Payment\">ссылке</a>",
                        _ => "Вы запросили кластерный или тиковый график. Бесплатным пользователям доступен только Газпром (GAZP).<br>Оформить подписку можно по <a href=\"/Payment\">ссылке</a>"
                    };

                    return StatusCode(403, message);
                }
            }
            return null;
        }

        private DateTime GetDefaultStartDate(string ticker, decimal period)
        {
            int days = period switch
            {
                <= 5 => 2,
                <= 15 => 3,
                <= 60 => 5,
                <= 1440 => 50,
                _ => 1
            };
            return _stockMarketServiceRepository.LastTradingDateTickerCached(ticker) - TimeSpan.FromDays(days);
        }

        private bool IsFormulaTicker(string ticker)
        {
            Regex formulaRegex = new Regex(@"[*\-+/()]");
            return !_tickersRepository.Tickers.ContainsKey(ticker) && formulaRegex.IsMatch(ticker);
        }

        private DateTimePair GetDateTimePair(DateTime? startDate, DateTime? endDate, decimal period)
        {
            var start = startDate ?? DateTime.Now;
            var end = endDate ?? DateTime.Now.AddDays(2);

            if (start.Date == start || end.Date == end)
            {
                end = end.AddDays(1);
            }
            else if (end.Second == 0 && end.Millisecond == 0)
            {
                end = end.AddMinutes(1);
            }

            return new DateTimePair(start, end);
        }

        private async Task<object> GetClusterData(string ticker, decimal period, decimal priceStep, DateTimePair dates, bool candlesOnly, bool glued)
        {
            if (candlesOnly)
            {
                if (period == 3)
                {
                    if (dates.Start.Date != DateTime.Now.Date && (dates.End - dates.Start).TotalDays > 1)
                    {
                        return StatusCode(403, "Трейдовый график доступен только по запросу внутри дня");
                    }

                    var tradesCandles = await _candlesRepository.GetTradesCandles(ticker, dates.Start, dates.End);
                    return new
                    {
                        priceScale = priceStep,
                        VolumePerQuantity = _tickersRepository[ticker].Lotsize ?? 1,
                        clusterData = tradesCandles
                    };
                }
                else
                {
                    var clusterData = glued
                        ? await _candlesRepository.GetCandlesGlued1(ticker + "##", (int)period, dates.Start, dates.End, 1000)
                        : await _candlesRepository.ClusterProfileQuery(ticker, period, dates, priceStep, false);

                    _stockMarketServiceRepository.UpdateAlias(ref ticker);

                    return new
                    {
                        priceScale = priceStep,
                        VolumePerQuantity = _tickersRepository[ticker].Lotsize ?? 1,
                        clusterData
                    };
                }
            }

            if (period == 3)
            {
                var tradesClusters = await _candlesRepository.GetTradesClusters(ticker, dates.Start, dates.End, priceStep);
                return new
                {
                    priceScale = priceStep,
                    VolumePerQuantity = _tickersRepository[ticker].Lotsize ?? 1,
                    clusterData = tradesClusters
                };
            }
            else
            {
                var clusterProfile = await _clusterRepository.ClusterProfileQuery(_tickersRepository[ticker].Id, _tickersRepository[ticker].Market.Value, period, dates, priceStep, false);
                return new
                {
                    priceScale = priceStep,
                    VolumePerQuantity = _tickersRepository[ticker].Lotsize ?? 1,
                    clusterData = clusterProfile
                };
            }
        }
    }
}
