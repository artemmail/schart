using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IMoexSyncService
    {
        Task<int> SyncStocksEmitentsAsync(CancellationToken cancellationToken = default);
        Task<int> SyncBondsAsync(CancellationToken cancellationToken = default);
        Task<int> SyncFuturesAsync(CancellationToken cancellationToken = default);
        Task<int> SyncOptionsAsync(CancellationToken cancellationToken = default);
        Task<int> SyncOptionsForAssetAsync(string asset, CancellationToken cancellationToken = default);
        Task<MoexSyncSummary> SyncAllAsync(CancellationToken cancellationToken = default);
    }
}
