using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Services;
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

        [HttpGet("Markovitz")]
        public async Task<PortfolioSolution> Markovitz(string tickers, DateTime startDate, DateTime endDate, DateTime portfolioDate, decimal deposit, decimal risk)
        {
            var user = await _userManager.GetUserAsync(User);
            var userId = (Guid)user.Id;
            var tickersList = _portfolioRepository.TickersFromString(tickers);
            return await _portfolioRepository.PortfolioOptimizationSolv(userId, tickersList, startDate, endDate, portfolioDate, deposit, risk);
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
