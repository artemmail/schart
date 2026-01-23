using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IDividendsMoexService
    {
        Task<DividendsResponse> GetDividendsAsync(string ticker, CancellationToken cancellationToken = default);
        Task<int> UpdateDueDividendsAsync(CancellationToken cancellationToken = default);
    }
}
