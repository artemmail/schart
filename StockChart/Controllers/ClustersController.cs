using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Services;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using static StockProcContext;

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
        private readonly StockProcContext _dbContext;

        public ClustersController(
            ICandlesRepository candlesRepository,
            ICandlesRepositorySet candlesRepositorySet,
            ITickersRepository tickers,
            IReportsRepository reports,
            IClusterRepository clusterRepository,
            UserManager<ApplicationUser> userManager,
            IUsersRepository usersRepository,
            StockProcContext dbContext,
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
                end = end.AddDays(1);
            else
                end = end.AddMinutes(1);

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
