using StockChart.Model;
using static StockChart.Repository.Services.PortfoiloRepository;

namespace StockChart.Repository.Services
{
    public interface IPortfoiloRepository
    {
        public Task<List<Portfolio>> GetPortfolio(Guid UserId, byte portfolio);
        public Task<UserGameBallance?> GetBallance(Guid UserId, byte portfolio);
        public Task MakeOrder(Guid UserId, string ticker, int quantity, byte PortfolioNumber, decimal? money = null, decimal? price = null);
        public Task DepositPortfolio(Guid UserId, byte portfolioNumber, decimal amount);
        public Task CleanUpPortfolio(Guid UserId, byte portfolio);
        public Task CopyPortfolio(Guid UserId, byte fromportfolio, byte toportfolio);

        public List<string> TickersFromString(string s);

        public Task<PortfolioSolution> PortfolioOptimizationSolv(Guid UserId, List<string> tickers,
            DateTime startDate, DateTime endDate, DateTime portfolioDate, decimal deposit, decimal risk);
    }
}
