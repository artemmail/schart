using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Services;
using System.Globalization;
using static StockChart.Repository.Services.PortfoiloRepository;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PortfolioController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IPortfoiloRepository _portfolioRepository;

        public PortfolioController(
            UserManager<ApplicationUser> userManager,
            IPortfoiloRepository portfolioRepository
         )
        {
            _userManager = userManager;
            _portfolioRepository = portfolioRepository;
        }

        [HttpGet("getShares")]
        public async Task<List<Portfolio>> GetShares(int? portfolioNumber)
        {
            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            var shares = await _portfolioRepository.GetPortfolio(userId, (byte)portfolioNumber);
            var balance = (await _portfolioRepository.GetBallance(userId, (byte)portfolioNumber)).Ballance;
            var nowCost = shares.Sum(x => x.nowcost ?? 0);
            var buyCost = shares.Sum(x => x.buycost ?? 0);
            var profit = shares.Sum(x => x.profit ?? 0);

            if (shares.Count > 0)
            {
                shares.Add(new Portfolio
                {
                    ticker = PortfolioTableToFormula(shares),
                    name = "Итого",
                    nowcost = nowCost,
                    buycost = buyCost,
                    profit = profit
                });
            }

            shares.Add(new Portfolio { name = "Свободные средства", nowcost = balance });
            shares.Add(new Portfolio { name = "Цена портфеля", nowcost = balance + nowCost });

            return shares;
        }

        [HttpGet("MakeOrder")]
        public async Task<IActionResult> MakeOrder(string ticker, int quantity, int portfolioNumber)
        {
            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            await _portfolioRepository.MakeOrder(userId, ticker, quantity, (byte)portfolioNumber);
            return Ok();
        }

        [HttpGet("MakeOrderSpec")]
        public async Task<IActionResult> MakeOrderSpec(string ticker, int quantity, decimal price, int portfolioNumber)
        {
            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            await _portfolioRepository.MakeOrder(userId, ticker, quantity, (byte)portfolioNumber, price: price);
            return Ok();
        }

        [HttpGet("DepositPortfolio")]
        public async Task<IActionResult> DepositPortfolio(decimal amount, int portfolioNumber)
        {
            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            await _portfolioRepository.DepositPortfolio(userId, (byte)portfolioNumber, amount);
            return Ok();
        }

        public class PortfolioComparesResult
        {
            public string res1 { get; }
            public string res2 { get; }

            public PortfolioComparesResult(string res1, string res2)
            {
                this.res1 = res1;
                this.res2 = res2;
            }
        }

        [HttpGet("PortfolioCompares")]
        public async Task<PortfolioComparesResult> PortfolioCompares(int portfolio1, int portfolio2)
        {
            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            var res1 = PortfolioTableToFormula(await _portfolioRepository.GetPortfolio(userId, (byte)portfolio1));
            var res2 = PortfolioTableToFormula(await _portfolioRepository.GetPortfolio(userId, (byte)portfolio2));
            return new PortfolioComparesResult(res1, res2);
        }

        private string PortfolioTableToFormula(List<Portfolio> shares)
        {
            return string.Join('+', shares.Select(v => $"{v.ticker}*{v.quantity}"));
        }

        private static bool TryParseSectorMaxWeights(string? raw, out IReadOnlyDictionary<int, decimal> limits, out string? error)
        {
            limits = new Dictionary<int, decimal>();
            error = null;

            if (string.IsNullOrWhiteSpace(raw))
                return true;

            var result = new Dictionary<int, decimal>();
            var pairs = raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var pair in pairs)
            {
                var parts = pair.Split(':', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (parts.Length != 2)
                {
                    error = $"Invalid sectorMaxWeights item '{pair}'. Expected format: sectorKey:weight";
                    return false;
                }

                if (!int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var sectorKey) || sectorKey <= 0)
                {
                    error = $"Invalid sector key '{parts[0]}'. Sector key must be a positive integer.";
                    return false;
                }

                var weightRaw = parts[1].Replace(',', '.');
                if (!decimal.TryParse(weightRaw, NumberStyles.Number, CultureInfo.InvariantCulture, out var maxWeight))
                {
                    error = $"Invalid sector weight '{parts[1]}'.";
                    return false;
                }

                if (maxWeight <= 0m || maxWeight > 1m)
                {
                    error = $"Invalid sector weight '{parts[1]}'. Allowed range: (0, 1].";
                    return false;
                }

                result[sectorKey] = maxWeight;
            }

            limits = result;
            return true;
        }

        private static bool TryBuildOptimizationOptions(
            string mode,
            decimal riskFreeRate,
            decimal? minWeight,
            decimal? maxWeight,
            string? sectorMaxWeights,
            out PortfolioOptimizationRequestOptions options,
            out string? error)
        {
            options = new PortfolioOptimizationRequestOptions();
            error = null;

            if (!PortfolioOptimizationModeParser.TryParse(mode, out var parsedMode))
            {
                error = "Unknown mode. Allowed: min_variance, max_return, max_sharpe";
                return false;
            }

            var minW = minWeight ?? 0m;
            var maxW = maxWeight ?? 1m;
            if (minW < 0m || maxW > 1m || minW > maxW)
            {
                error = "Invalid minWeight/maxWeight. Expected: 0 <= minWeight <= maxWeight <= 1";
                return false;
            }

            if (!TryParseSectorMaxWeights(sectorMaxWeights, out var sectorLimits, out error))
                return false;

            options = new PortfolioOptimizationRequestOptions
            {
                Mode = parsedMode,
                RiskFreeRate = riskFreeRate,
                MinWeight = minW,
                MaxWeight = maxW,
                SectorMaxWeights = sectorLimits,
            };

            return true;
        }

        [HttpGet("Markovitz")]
        public async Task<ActionResult<PortfolioSolution>> Markovitz(
            string tickers,
            DateTime startDate,
            DateTime endDate,
            DateTime portfolioDate,
            decimal deposit,
            decimal risk,
            string mode = "min_variance",
            decimal riskFreeRate = 0m,
            decimal? minWeight = null,
            decimal? maxWeight = null,
            string? sectorMaxWeights = null)
        {
            if (startDate >= endDate)
                return BadRequest(new { error = "startDate must be before endDate" });
            if (risk <= 0)
                return BadRequest(new { error = "risk must be > 0" });

            if (!TryBuildOptimizationOptions(mode, riskFreeRate, minWeight, maxWeight, sectorMaxWeights, out var options, out var optionsError))
                return BadRequest(new { error = optionsError });

            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            var tickersList = _portfolioRepository.TickersFromString(tickers);
            var result = await _portfolioRepository.PortfolioOptimizationSolv(
                userId,
                tickersList,
                startDate,
                endDate,
                portfolioDate,
                deposit,
                risk,
                options);
            if (!result.success)
                return UnprocessableEntity(result);

            return Ok(result);
        }

        [HttpGet("MarkovitzMcp")]
        public async Task<ActionResult<PortfolioSolution>> MarkovitzMcp(
            string tickers,
            DateTime startDate,
            DateTime endDate,
            decimal risk,
            string mode = "min_variance",
            decimal riskFreeRate = 0m,
            decimal? minWeight = null,
            decimal? maxWeight = null,
            string? sectorMaxWeights = null)
        {
            if (startDate >= endDate)
                return BadRequest(new { error = "startDate must be before endDate" });
            if (risk <= 0)
                return BadRequest(new { error = "risk must be > 0" });
            if (!TryBuildOptimizationOptions(mode, riskFreeRate, minWeight, maxWeight, sectorMaxWeights, out var options, out var optionsError))
                return BadRequest(new { error = optionsError });

            var tickersList = _portfolioRepository.TickersFromString(tickers);
            if (tickersList.Count == 0)
                return BadRequest(new { error = "No valid tickers were provided" });

            var result = await _portfolioRepository.PortfolioOptimizationPreview(tickersList, startDate, endDate, risk, options);
            if (!result.success)
                return UnprocessableEntity(result);

            return Ok(result);
        }

        [HttpGet("CopyPortfolio")]
        public async Task<IActionResult> CopyPortfolio(byte fromPortfolio, byte toPortfolio)
        {
            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            await _portfolioRepository.CopyPortfolio(userId, fromPortfolio, toPortfolio);
            return Ok();
        }

        [HttpGet("CleanUpPortfolio")]
        public async Task<IActionResult> CleanUpPortfolio(byte portfolioNumber)
        {
            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            await _portfolioRepository.CleanUpPortfolio(userId, portfolioNumber);
            return Ok();
        }
    }
}
