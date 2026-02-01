using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using StockChart.Repository.Moex.OptionCalc;

namespace StockChart.Repository.Interfaces
{
    /// <summary>
    /// Typed client for MOEX Options Calculator API (/iss/apps/option-calc/v1).
    /// </summary>
    public interface IMoexOptionCalcService
    {
        Task<IReadOnlyList<AssetDto>> GetAssetsAsync(AssetType? assetType = null, AssetSubtype? assetSubtype = null, string? query = null, CancellationToken ct = default);
        Task<AssetDto> GetAssetAsync(string assetCode, AssetType? assetType = null, CancellationToken ct = default);

        Task<IReadOnlyList<FuturesDto>> GetFuturesAsync(string assetCode, DateOnly? expirationDate = null, CancellationToken ct = default);
        Task<IReadOnlyList<OptionDto>> GetOptionsAsync(
            string assetCode,
            AssetType? assetType = null,
            DateOnly? expirationDate = null,
            OptionSeriesType? seriesType = null,
            decimal? strike = null,
            OptionType? optionType = null,
            CancellationToken ct = default);

        Task<OptionBriefDto> GetOptionBriefAsync(
            string assetCode,
            string secid,
            AssetType? assetType = null,
            int? daysUntilExpiring = null,
            decimal? underlyingPrice = null,
            decimal? volatility = null,
            CancellationToken ct = default);

        Task<IReadOnlyList<OptionSeriesDto>> GetOptionSeriesAsync(string assetCode, AssetType? assetType = null, CancellationToken ct = default);
        Task<OptionSeriesDto> GetOptionSeriesAsync(string assetCode, string optionSeriesCode, AssetType? assetType = null, CancellationToken ct = default);
        Task<IReadOnlyList<OptionDto>> GetOptionsInSeriesAsync(
            string assetCode,
            string optionSeriesCode,
            AssetType? assetType = null,
            int? strike = null,
            OptionType? optionType = null,
            CancellationToken ct = default);
        Task<OptionBoardDto> GetOptionBoardAsync(string assetCode, string optionSeriesCode, AssetType? assetType = null, int? rows = null, CancellationToken ct = default);
        Task<IReadOnlyList<VolatilityGraphPointDto>> GetVolatilityGraphAsync(string assetCode, string optionSeriesCode, AssetType? assetType = null, CancellationToken ct = default);

        Task<CalculatedPortfolioDto> CalculatePortfolioAsync(OptionPortfolioRequestDto portfolio, CancellationToken ct = default);
        Task<IndicatorGraphDto> GetPortfolioGraphAsync(IndicatorType indicator, OptionPortfolioRequestDto portfolio, CancellationToken ct = default);
        Task<decimal> CalculateInitialMarginAsync(IReadOnlyList<InitialMarginPositionDto> positions, CancellationToken ct = default);
    }
}
