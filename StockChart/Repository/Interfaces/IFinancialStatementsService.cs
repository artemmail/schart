using System.Collections.Generic;
using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IFinancialStatementsService
    {
        Task<IReadOnlyList<FinancialStatementEntryDto>> GetStatementsAsync(
            string ticker,
            string standard,
            string period,
            string mode,
            CancellationToken cancellationToken = default);

        Task<int> ImportFromFolderAsync(string folderPath, CancellationToken cancellationToken = default);
    }
}
