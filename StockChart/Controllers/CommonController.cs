using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Services;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommonController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ICandlesRepository _candlesRepository;
        private readonly IStockMarketServiceRepository _stockMarketServiceRepository;
        private readonly ITickersRepository _tickers;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly StockProcContext _dbContext;
        private readonly BatchImportOpenPositionsService _batchImportService;
        private readonly IUsersRepository _usersRepository;

        public CommonController(
            StockProcContext dbContext,
            ICandlesRepository candlesRepository,
            ITickersRepository tickers,
            IStockMarketServiceRepository stockMarketServiceRepository,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            BatchImportOpenPositionsService batchImportService,
            IUsersRepository usersRepository)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _candlesRepository = candlesRepository;
            _tickers = tickers;
            _stockMarketServiceRepository = stockMarketServiceRepository;
            _signInManager = signInManager;
            _batchImportService = batchImportService;
            _usersRepository = usersRepository;
        }

        [HttpGet("contracts")]
        public ActionResult<List<string>> GetAllContracts()
        {
            var contracts = _batchImportService.GetAllContracts();
            return Ok(contracts);
        }

        [HttpGet("positions/{contractName}")]
        public async Task<IActionResult> GetOpenPositionsByContract(string contractName)
        {
            var isDemoContract = string.Equals(contractName?.Trim(), "Si", StringComparison.OrdinalIgnoreCase);
            var applicationUser = await _userManager.GetUserAsync(User);

            if (!isDemoContract && (applicationUser == null || !_usersRepository.IsPayed(applicationUser, 1)))
            {
                var message = "Данные по открытому интересу доступны по активной подписке. " +
                    "Оформите подписку, чтобы посмотреть все контракты, или выберите бесплатный контракт Si.";
                return StatusCode(StatusCodes.Status403Forbidden, message);
            }

            var openPositions = _batchImportService.GetOpenPositionsByContract(contractName);

            if (openPositions == null || !openPositions.Any())
            {
                return NotFound($"Контракт с именем {contractName} не найден.");
            }

            return Ok(openPositions);
        }

        [HttpGet("ModifyTickers")]
        public IActionResult ModifyTickers(string tickers)
        {
            if (string.IsNullOrWhiteSpace(tickers))
                return BadRequest("Tickers parameter is required.");

            var tickerList = tickers.Split(',')
                .Select(t =>
                {
                    _stockMarketServiceRepository.UpdateAlias(ref t);
                    return t;
                })
                .Distinct()
                .Where(t => _tickers.Tickers.ContainsKey(t.ToUpper()))
                .Select(t => new SelectListItem
                {
                    Text = ExtractDescription(_tickers[t].Shortname),
                    Value = t
                })
                .ToList();

            return Ok(tickerList);
        }

        private static string ExtractDescription(string shortname)
        {
            var start = shortname.IndexOf('(');
            var end = shortname.IndexOf(')', start + 1);

            if (start > -1 && end > start)
            {
                return shortname.Substring(start + 1, end - start - 1).Trim();
            }

            return shortname;
        }

        [HttpPost("Login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest loginRequest)
        {
            if (loginRequest == null || string.IsNullOrWhiteSpace(loginRequest.Login) || string.IsNullOrWhiteSpace(loginRequest.Password))
            {
                return BadRequest("Invalid login request.");
            }

            var result = await _signInManager.PasswordSignInAsync(loginRequest.Login, loginRequest.Password, false, lockoutOnFailure: false);

            if (!result.Succeeded)
            {
                return Unauthorized();
            }

            var user = await _userManager.FindByNameAsync(loginRequest.Login);
            var email = await _userManager.GetEmailAsync(user);

            var payments = await _dbContext.Payments
                .Include(p => p.User)
                .Where(p => p.User.UserName == loginRequest.Login)
                .OrderByDescending(p => p.Id)
                .Select(p => new
                {
                    p.Id,
                    UserName = p.User.UserName,
                    Email = p.User.Email,
                    p.PayAmount,
                    p.PayDate,
                    p.ExpireDate,
                    p.Service
                })
                .ToListAsync();

            object userInfo = payments.Any()
                ? new
                {
                    PayDate = payments.Min(p => p.PayDate),
                    PayAmount = payments.Sum(p => p.PayAmount),
                    ExpireDate = payments.Max(p => p.ExpireDate),
                    Service = payments.First().Service,
                    UserName = payments.First().UserName,
                    Email = email
                }
                : new
                {
                    PayDate = DateTime.Now,
                    PayAmount = 0,
                    ExpireDate = DateTime.Now,
                    Service = 0,
                    UserName = loginRequest.Login,
                    Email = email
                };

            return Ok(new
            {
                validated = true,
                userInfo
            });
        }

        [HttpGet("Autocomplete")]
        public IActionResult Autocomplete(string mask, int count = 20)
        {
            if (string.IsNullOrWhiteSpace(mask))
                return BadRequest("Mask parameter is required.");

            var items = _tickers.findByMask(mask, count)
                .OrderBy(x => x.Securityid.Length)
                .Select(x => new SelectListItem
                {
                    Value = x.Securityid,
                    Text = $"{x.Shortname}({x.Securityid})"
                })
                .ToList();

            if (mask.Length == 2)
            {
                var maskAlias = mask;
                _stockMarketServiceRepository.UpdateAlias(ref maskAlias);
                if (maskAlias != mask)
                {
                    var additionalItems = new List<SelectListItem>
                    {
                        new SelectListItem
                        {
                            Value = maskAlias,
                            Text = $"{maskAlias}({_tickers[maskAlias].Shortname})"
                        },
                        new SelectListItem
                        {
                            Value = $"{mask}##",
                            Text = $"Склееный фьючерс {mask}##"
                        }
                    };
                    items.InsertRange(0, additionalItems);
                }
            }

            return Ok(items);
        }

        [HttpGet("FindByMask")]
        public IActionResult FindByMask(string mask, int count = 20)
        {
            if (string.IsNullOrWhiteSpace(mask))
                return BadRequest("Mask parameter is required.");

            var items = _tickers.findByMask(mask, count)
                .OrderBy(x => x.Securityid.Length)
                .Select(x => new MaskItem
                {
                    value = x.Securityid,
                    label = $"{x.Shortname}({x.Securityid})"
                })
                .ToList();

            if (mask.Length == 2)
            {
                var maskAlias = mask;
                _stockMarketServiceRepository.UpdateAlias(ref maskAlias);
                if (maskAlias != mask)
                {
                    var additionalItems = new List<MaskItem>
                    {
                        new MaskItem
                        {
                            value = maskAlias,
                            label = $"{maskAlias}({_tickers[maskAlias].Shortname})"
                        }
                    };
                    items.InsertRange(0, additionalItems);
                }
            }

            return Ok(items);
        }

        [HttpGet("markets")]
        public IActionResult GetMarkets()
        {
            var markets = _tickers.MarketById.Values
                .OrderBy(x => x.Id)
                .Select((x, index) => new SelectListItem
                {
                    Text = x.Name,
                    Value = x.Id.ToString(),
                    Selected = index == 0
                })
                .ToList();

            return Ok(markets);
        }

        [HttpGet("marketsnum")]
        public IActionResult GetMarketNumbers()
        {
            var marketNumbers = _tickers.MarketById.Values
                .OrderBy(x => x.Id)
                .Select(x => new OptionItem<int>
                {
                    Text = x.Name,
                    Value = x.Id
                })
                .ToList();

            return Ok(marketNumbers);
        }

        [HttpGet("categories")]
        public IActionResult GetCategories()
        {
            var categories = _dbContext.CategoryTypes
                .Select(ct => new SelectListItem
                {
                    Text = ct.Name,
                    Value = ct.Id.ToString()
                })
                .ToList();

            return Ok(categories);
        }

        [HttpGet("futinfo/{ticker}")]
        public async Task<IActionResult> GetFutureInfo(string ticker)
        {
            var info = await _stockMarketServiceRepository.TickerInfo(ticker);

            if (info == null)
                return NotFound();

            return Ok(info);
        }

        [HttpGet("presets")]
        public IActionResult GetPresets(string ticker, string type = "")
        {
            if (string.IsNullOrWhiteSpace(ticker))
                return BadRequest("Ticker parameter is required.");

            if (ticker.Length == 4 && ticker.Contains("##"))
            {
                ticker = ticker.Substring(0, 2);
                _stockMarketServiceRepository.UpdateAlias(ref ticker);
            }
            else
                _stockMarketServiceRepository.UpdateAlias(ref ticker);

            if (_tickers.Tickers.ContainsKey(ticker.ToUpper()))
            {
                var presets = _stockMarketServiceRepository.Presets(type, ticker);
                return Ok(presets);
            }

            return NotFound();
        }

        [HttpGet("jsonChartControls")]
        public IActionResult GetJsonChartControls(
            string ticker,
            decimal? priceStep,
            decimal? period,
            string? rperiod,
            string? startDate,
            string? endDate,
            bool? timeEnable,
            string? startTime,
            string? endTime,
            bool? oiEnable,
            bool? visualVolume,
            string type = "Candles")
        {
            var chartControls = _stockMarketServiceRepository.CandlesParamsToObject(
                ticker,
                priceStep,
                period,
                rperiod,
                startDate,
                endDate,
                timeEnable,
                startTime,
                endTime,
                visualVolume,
                type);

            return Ok(chartControls);
        }

        [HttpGet("jsonChartControlsNew")]
        public IActionResult GetJsonChartControlsNew(
            decimal? priceStep,
            decimal? period,
            string? rperiod,
            DateTime? startDate,
            DateTime? endDate,
            bool? candlesOnly,
            string type = "Candles",
            string ticker = "GAZP")
        {
            var chartControls = _stockMarketServiceRepository.CandlesParamsToObjectNew(
                ticker,
                priceStep,
                period,
                rperiod,
                startDate,
                endDate,
                type);

            if (candlesOnly.HasValue)
            {
                chartControls.candlesOnly = candlesOnly.Value;
            }

            return Ok(chartControls);
        }
    }

    public class LoginRequest
    {
        public string Login { get; set; }
        public string Password { get; set; }
    }

    public class MaskItem
    {
        public string value { get; set; }
        public string label { get; set; }
    }   
}
