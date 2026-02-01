using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Moex.OptionCalc;

namespace StockChart.Repository.Services
{
    /// <summary>
    /// Resolves user portfolio positions into MOEX option-calc simulated positions.
    /// </summary>
    public sealed class OptionCalcPortfolioBuilder : IOptionCalcPortfolioBuilder
    {
        private const byte MarketStocks = 0;
        private const byte MarketFutures = 1;
        private const byte MarketOptions = 7;

        private readonly ApplicationDbContext _dbContext;

        public OptionCalcPortfolioBuilder(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<OptionPortfolioRequestDto> BuildUserPortfolioAsync(
            Guid userId,
            byte portfolioNumber,
            string assetCode,
            AssetType? assetType,
            CancellationToken ct = default)
        {
            var normalizedAsset = NormalizeAssetCode(assetCode);

            var result = new OptionPortfolioRequestDto
            {
                AssetCode = normalizedAsset,
                AssetType = assetType,
                Positions = new List<SimulatedPositionDto>()
            };

            var rawPositions = await _dbContext.UserGameShares
                .AsNoTracking()
                .Where(s => s.UserId == userId && s.PortfolioNumber == portfolioNumber && s.Quantity != 0)
                .Select(s => new
                {
                    s.DictionaryId,
                    s.Quantity,
                    s.Price
                })
                .ToListAsync(ct);

            if (rawPositions.Count == 0)
            {
                return result;
            }

            var dictionaryIds = rawPositions.Select(p => p.DictionaryId).Distinct().ToList();

            var dictionaries = await _dbContext.Dictionaries
                .AsNoTracking()
                .Where(d => dictionaryIds.Contains(d.Id))
                .Select(d => new DictionaryInfo
                {
                    Id = d.Id,
                    SecurityId = d.Securityid,
                    Market = d.Market
                })
                .ToListAsync(ct);

            var dictionaryById = dictionaries.ToDictionary(d => d.Id);

            var optionIds = dictionaries.Where(d => d.Market == MarketOptions).Select(d => d.Id).ToList();
            var futureIds = dictionaries.Where(d => d.Market == MarketFutures).Select(d => d.Id).ToList();

            var optionAssetById = optionIds.Count == 0
                ? new Dictionary<int, string>()
                : await _dbContext.OptionSpecs
                    .AsNoTracking()
                    .Where(o => optionIds.Contains(o.DictionaryId) && o.AssetCode != null)
                    .Select(o => new { o.DictionaryId, o.AssetCode })
                    .ToDictionaryAsync(
                        o => o.DictionaryId,
                        o => NormalizeAssetCode(o.AssetCode!),
                        ct);

            var futureAssetById = futureIds.Count == 0
                ? new Dictionary<int, string>()
                : await _dbContext.FutureSpecs
                    .AsNoTracking()
                    .Where(f => futureIds.Contains(f.DictionaryId) && f.AssetCode != null)
                    .Select(f => new { f.DictionaryId, f.AssetCode })
                    .ToDictionaryAsync(
                        f => f.DictionaryId,
                        f => NormalizeAssetCode(f.AssetCode!),
                        ct);

            foreach (var position in rawPositions)
            {
                if (!dictionaryById.TryGetValue(position.DictionaryId, out var dic))
                {
                    continue;
                }

                if (string.IsNullOrWhiteSpace(dic.SecurityId))
                {
                    continue;
                }

                if (!TryResolvePosition(dic, normalizedAsset, optionAssetById, futureAssetById, out var positionType))
                {
                    continue;
                }

                result.Positions.Add(new SimulatedPositionDto
                {
                    SecId = dic.SecurityId.Trim(),
                    Type = positionType,
                    Quantity = position.Quantity,
                    // Use the stored entry price when it is positive; otherwise rely on MOEX prices.
                    Price = position.Price > 0m ? position.Price : null,
                    NettedIm = true
                });
            }

            // If asset type is missing but the portfolio includes the underlying share, default to share.
            if (result.AssetType == null && result.Positions.Any(p => p.Type == SimulatedPositionType.Share))
            {
                result.AssetType = AssetType.Share;
            }

            return result;
        }

        private static bool TryResolvePosition(
            DictionaryInfo dic,
            string normalizedAsset,
            IReadOnlyDictionary<int, string> optionAssetById,
            IReadOnlyDictionary<int, string> futureAssetById,
            out SimulatedPositionType positionType)
        {
            positionType = SimulatedPositionType.Share;

            if (!dic.Market.HasValue)
            {
                return false;
            }

            switch (dic.Market.Value)
            {
                case MarketStocks:
                    if (IsSameAsset(dic.SecurityId, normalizedAsset))
                    {
                        positionType = SimulatedPositionType.Share;
                        return true;
                    }
                    return false;

                case MarketFutures:
                    if (futureAssetById.TryGetValue(dic.Id, out var futureAsset)
                        && IsSameAsset(futureAsset, normalizedAsset))
                    {
                        positionType = SimulatedPositionType.Futures;
                        return true;
                    }
                    return false;

                case MarketOptions:
                    if (optionAssetById.TryGetValue(dic.Id, out var optionAsset)
                        && IsSameAsset(optionAsset, normalizedAsset))
                    {
                        positionType = SimulatedPositionType.Option;
                        return true;
                    }
                    return false;

                default:
                    return false;
            }
        }

        private static string NormalizeAssetCode(string assetCode)
        {
            return string.IsNullOrWhiteSpace(assetCode)
                ? string.Empty
                : assetCode.Trim().ToUpperInvariant();
        }

        private static bool IsSameAsset(string? assetCode, string normalizedAsset)
        {
            if (string.IsNullOrWhiteSpace(assetCode) || string.IsNullOrWhiteSpace(normalizedAsset))
            {
                return false;
            }

            return string.Equals(assetCode.Trim(), normalizedAsset, StringComparison.OrdinalIgnoreCase);
        }

        private sealed class DictionaryInfo
        {
            public int Id { get; set; }
            public string? SecurityId { get; set; }
            public byte? Market { get; set; }
        }
    }
}
