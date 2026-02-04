using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IMoexApiService
    {
        Task<IReadOnlyList<OpenPosRow>?> GetOpenPositionsAsync(string contractName, DateTime date, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<MoexDividendRow>?> GetDividendsAsync(string ticker, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<ShareInfo>> GetSharesAsync(string boardId, int start, int limit, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<MoexBondRow>> GetCorporateBondsAsync(int start, int limit, CancellationToken cancellationToken = default);
        Task<BondDetails?> GetBondDetailsAsync(string secid, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<MoexBondMarketRow>> GetBondMarketDataAsync(IEnumerable<string> secids, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<MoexBondCouponRow>> GetBondCouponsAsync(string secid, CancellationToken cancellationToken = default);
        Task<Dictionary<string, decimal>> GetBondEffectiveYieldsAsync(IEnumerable<string> secids, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<MoexFutureRow>> GetFuturesAsync(CancellationToken cancellationToken = default);
        Task<IReadOnlyList<MoexOptionRow>> GetOptionsAsync(string asset, CancellationToken cancellationToken = default);
        Task<EmitentInfo?> GetEmitentAsync(string secid, CancellationToken cancellationToken = default);
    }
}
