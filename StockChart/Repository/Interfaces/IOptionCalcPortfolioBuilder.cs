using System;
using System.Threading;
using System.Threading.Tasks;
using StockChart.Repository.Moex.OptionCalc;

namespace StockChart.Repository.Interfaces
{
    /// <summary>
    /// Builds MOEX option-calc portfolio requests from user-stored positions.
    /// </summary>
    public interface IOptionCalcPortfolioBuilder
    {
        /// <summary>
        /// Maps a user's stored portfolio to the option-calc request format for a single underlying asset.
        /// </summary>
        Task<OptionPortfolioRequestDto> BuildUserPortfolioAsync(
            Guid userId,
            byte portfolioNumber,
            string assetCode,
            AssetType? assetType,
            CancellationToken ct = default);
    }
}
