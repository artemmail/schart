using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/options")]
    public sealed class OptionsController : ControllerBase
    {
        private const byte MarketStocks = 0;
        private const double DefaultDayCount = 365d;
        private const decimal DefaultRiskFreeRate = 0m;

        private readonly ApplicationDbContext _dbContext;
        private readonly IMoexApiService _moexApiService;
        private readonly IMoexSyncService _moexSyncService;

        public OptionsController(ApplicationDbContext dbContext, IMoexApiService moexApiService, IMoexSyncService moexSyncService)
        {
            _dbContext = dbContext;
            _moexApiService = moexApiService;
            _moexSyncService = moexSyncService;
        }

        [HttpGet("assets")]
        public async Task<ActionResult<string[]>> GetAssets(CancellationToken cancellationToken)
        {
            var assets = await _dbContext.OptionSpecs
                .AsNoTracking()
                .Where(o => o.AssetCode != null)
                .Select(o => o.AssetCode!)
                .Distinct()
                .OrderBy(a => a)
                .ToListAsync(cancellationToken);

            return Ok(assets.ToArray());
        }

        [HttpGet("expirations")]
        public async Task<ActionResult<string[]>> GetExpirations(string asset, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(asset))
            {
                return BadRequest("asset is required.");
            }

            var assetCode = asset.Trim().ToUpperInvariant();
            var expirations = await _dbContext.OptionSpecs
                .AsNoTracking()
                .Where(o => o.AssetCode == assetCode && o.ExpirationDate.HasValue)
                .Select(o => o.ExpirationDate!.Value.Date)
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync(cancellationToken);

            var result = expirations
                .Select(d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture))
                .ToArray();

            return Ok(result);
        }

        [HttpGet("smile")]
        public async Task<ActionResult<OptionSmileResponse>> GetSmile(
            string asset,
            string expiration,
            string? optionType,
            DateTime? asOf,
            bool? refresh,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(asset))
            {
                return BadRequest("asset is required.");
            }

            if (string.IsNullOrWhiteSpace(expiration))
            {
                return BadRequest("expiration is required (yyyy-MM-dd).");
            }

            if (!DateTime.TryParseExact(expiration, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var expirationDate))
            {
                return BadRequest("expiration must be in yyyy-MM-dd format.");
            }

            var normalizedType = NormalizeOptionType(optionType);
            if (optionType != null && normalizedType == null)
            {
                return BadRequest("optionType must be C or P (or CALL/PUT).");
            }

            var assetCode = asset.Trim().ToUpperInvariant();
            if (refresh == true)
            {
                await _moexSyncService.SyncOptionsForAssetAsync(assetCode, cancellationToken);
            }
            var specQuery = _dbContext.OptionSpecs
                .AsNoTracking()
                .Where(o => o.AssetCode != null && o.AssetCode == assetCode && o.ExpirationDate == expirationDate.Date);

            if (!string.IsNullOrWhiteSpace(normalizedType))
            {
                specQuery = specQuery.Where(o => o.OptionType == normalizedType);
            }

            var dictQuery = _dbContext.Dictionaries.AsNoTracking();

            if (asOf.HasValue)
            {
                var asOfUtc = NormalizeAsOf(asOf.Value);
                var snapshotQuery = _dbContext.OptionMarketSnapshots
                    .AsNoTracking()
                    .Where(s => s.ImportedAt <= asOfUtc)
                    .GroupBy(s => s.DictionaryId)
                    .Select(g => g.OrderByDescending(x => x.ImportedAt).First());

                var pointRows = await (from spec in specQuery
                        join dic in dictQuery on spec.DictionaryId equals dic.Id
                        join snap in snapshotQuery on spec.DictionaryId equals snap.DictionaryId
                        select new
                        {
                            Point = new OptionSmilePoint
                            {
                                SecurityId = dic.Securityid,
                                OptionType = !string.IsNullOrWhiteSpace(snap.OptionType) ? snap.OptionType : spec.OptionType,
                                BoardId = snap.BoardId ?? spec.BoardId,
                                Strike = snap.Strike ?? spec.Strike,
                                LotSize = spec.LotSize,
                                ImpliedVolatility = snap.Volat ?? spec.Volat,
                                TheorPrice = snap.TheorPrice ?? spec.TheorPrice,
                                Last = snap.Last ?? spec.Last,
                                Bid = snap.Bid ?? spec.Bid,
                                Offer = snap.Offer ?? spec.Offer,
                                VolToday = snap.VolToday ?? spec.VolToday,
                                OpenPosition = snap.OpenPosition ?? spec.OpenPosition
                            },
                            UnderlyingPrice = snap.UnderlyingPrice ?? spec.UnderlyingPrice
                        })
                    .OrderBy(p => p.Point.OptionType)
                    .ThenBy(p => p.Point.Strike)
                    .ToListAsync(cancellationToken);

                if (pointRows.Count == 0)
                {
                    return NotFound();
                }

                var points = new List<OptionSmilePoint>(pointRows.Count);
                decimal? storedUnderlyingAsOf = null;
                foreach (var row in pointRows)
                {
                    points.Add(row.Point);
                    if (!storedUnderlyingAsOf.HasValue && row.UnderlyingPrice.HasValue)
                    {
                        storedUnderlyingAsOf = row.UnderlyingPrice;
                    }
                }

                var underlyingPrice = storedUnderlyingAsOf ?? await ResolveUnderlyingPriceAsync(assetCode, expirationDate.Date, cancellationToken);
                var impliedForward = ResolveForwardPriceFromPoints(points, asOfUtc, expirationDate.Date, DefaultRiskFreeRate);
                var pricingForwardAsOf = underlyingPrice ?? impliedForward;

                ApplyGreeks(points, pricingForwardAsOf, asOfUtc, expirationDate.Date, DefaultRiskFreeRate);

                return Ok(new OptionSmileResponse
                {
                    AssetCode = assetCode,
                    ExpirationDate = expirationDate.Date,
                    AsOf = asOfUtc,
                    UnderlyingPrice = pricingForwardAsOf,
                    Points = points
                });
            }

            var currentRows = await (from spec in specQuery
                    join dic in dictQuery on spec.DictionaryId equals dic.Id
                    select new
                    {
                        Point = new OptionSmilePoint
                        {
                            SecurityId = dic.Securityid,
                            OptionType = spec.OptionType,
                            BoardId = spec.BoardId,
                            Strike = spec.Strike,
                            LotSize = spec.LotSize,
                            ImpliedVolatility = spec.Volat,
                            TheorPrice = spec.TheorPrice,
                            Last = spec.Last,
                            Bid = spec.Bid,
                            Offer = spec.Offer,
                            VolToday = spec.VolToday,
                            OpenPosition = spec.OpenPosition
                        },
                        UnderlyingPrice = spec.UnderlyingPrice
                    })
                .OrderBy(p => p.Point.OptionType)
                .ThenBy(p => p.Point.Strike)
                .ToListAsync(cancellationToken);

            if (currentRows.Count == 0)
            {
                return NotFound();
            }

            var currentPoints = new List<OptionSmilePoint>(currentRows.Count);
            decimal? storedUnderlying = null;
            foreach (var row in currentRows)
            {
                currentPoints.Add(row.Point);
                if (!storedUnderlying.HasValue && row.UnderlyingPrice.HasValue)
                {
                    storedUnderlying = row.UnderlyingPrice;
                }
            }

            var currentUnderlyingPrice = storedUnderlying ?? await ResolveUnderlyingPriceAsync(assetCode, expirationDate.Date, cancellationToken);
            var currentForward = ResolveForwardPriceFromPoints(currentPoints, DateTime.UtcNow, expirationDate.Date, DefaultRiskFreeRate);
            if (!currentUnderlyingPrice.HasValue && !currentForward.HasValue)
            {
                currentUnderlyingPrice = await ResolveMoexUnderlyingPriceAsync(assetCode, cancellationToken);
            }
            var pricingForward = currentUnderlyingPrice ?? currentForward;

            ApplyGreeks(currentPoints, pricingForward, DateTime.UtcNow, expirationDate.Date, DefaultRiskFreeRate);

            return Ok(new OptionSmileResponse
            {
                AssetCode = assetCode,
                ExpirationDate = expirationDate.Date,
                UnderlyingPrice = pricingForward,
                Points = currentPoints
            });
        }

        [HttpGet("smile/moex")]
        public async Task<ActionResult<OptionSmileResponse>> GetSmileFromMoex(
            string asset,
            string? expiration,
            string? optionType,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(asset))
            {
                return BadRequest("asset is required.");
            }

            DateTime? expirationDate = null;
            if (!string.IsNullOrWhiteSpace(expiration))
            {
                if (!DateTime.TryParseExact(expiration, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                {
                    return BadRequest("expiration must be in yyyy-MM-dd format.");
                }

                expirationDate = parsed.Date;
            }

            var normalizedType = NormalizeOptionType(optionType);
            if (optionType != null && normalizedType == null)
            {
                return BadRequest("optionType must be C or P (or CALL/PUT).");
            }

            var rows = await _moexApiService.GetOptionsAsync(asset, cancellationToken);
            if (rows.Count == 0)
            {
                return NotFound();
            }

            var assetCode = rows.FirstOrDefault(r => !string.IsNullOrWhiteSpace(r.AssetCode))?.AssetCode
                            ?? asset.Trim().ToUpperInvariant();

            var filtered = rows.AsEnumerable();
            if (expirationDate is DateTime expirationFilter)
            {
                filtered = filtered.Where(r =>
                {
                    DateTime? rowExpiration = r.ExpirationDate;
                    return rowExpiration.HasValue && rowExpiration.Value.Date == expirationFilter.Date;
                });
            }

            if (!string.IsNullOrWhiteSpace(normalizedType))
            {
                filtered = filtered.Where(r => NormalizeOptionType(r.OptionType) == normalizedType);
            }

            var pointRows = filtered
                .Select(row => new
                {
                    Row = row,
                    Point = new OptionSmilePoint
                    {
                        SecurityId = row.SecId,
                    OptionType = NormalizeOptionType(row.OptionType) ?? row.OptionType,
                    BoardId = row.BoardId,
                    Strike = row.Strike,
                    LotSize = row.LotSize,
                    ImpliedVolatility = row.Volat,
                    TheorPrice = row.TheorPrice,
                    Last = row.Last,
                    Bid = row.Bid,
                    Offer = row.Offer,
                        VolToday = row.VolToday,
                        OpenPosition = row.OpenPosition
                    }
                })
                .OrderBy(p => p.Point.OptionType)
                .ThenBy(p => p.Point.Strike)
                .ToList();

            if (pointRows.Count == 0)
            {
                return NotFound();
            }

            var resolvedExpiration = expirationDate
                                     ?? pointRows
                                         .Select(p => (DateTime?)p.Row.ExpirationDate)
                                         .Select(d => d?.Date)
                                         .FirstOrDefault(d => d.HasValue);

            if (!resolvedExpiration.HasValue)
            {
                return NotFound();
            }

            var points = pointRows.Select(p => p.Point).ToList();
            var fallbackUnderlying = pointRows
                .Select(p => p.Row.UnderlyingPrice)
                .FirstOrDefault(p => p.HasValue);

            if (!fallbackUnderlying.HasValue)
            {
                fallbackUnderlying = await ResolveUnderlyingPriceAsync(assetCode, resolvedExpiration.Value, cancellationToken);
            }

            var valuationDate = DateTime.UtcNow;
            var impliedForward = ResolveForwardPriceFromPoints(points, valuationDate, resolvedExpiration.Value, DefaultRiskFreeRate);
            var pricingForward = fallbackUnderlying ?? impliedForward;

            ApplyGreeks(points, pricingForward, valuationDate, resolvedExpiration.Value, DefaultRiskFreeRate);

            return Ok(new OptionSmileResponse
            {
                AssetCode = assetCode,
                ExpirationDate = resolvedExpiration.Value,
                UnderlyingPrice = pricingForward,
                Points = points
            });
        }

        private static void ApplyGreeks(
            ICollection<OptionSmilePoint> points,
            decimal? underlyingPrice,
            DateTime valuationDateUtc,
            DateTime expirationDate,
            decimal riskFreeRate)
        {
            if (points.Count == 0)
            {
                return;
            }

            foreach (var point in points)
            {
                ApplyGreeks(point, underlyingPrice, valuationDateUtc, expirationDate, riskFreeRate);
            }
        }

        private static void ApplyGreeks(
            OptionSmilePoint point,
            decimal? underlyingPrice,
            DateTime valuationDateUtc,
            DateTime expirationDate,
            decimal riskFreeRate)
        {
            if (!point.Strike.HasValue || !point.ImpliedVolatility.HasValue)
            {
                return;
            }

            var normalizedType = NormalizeOptionType(point.OptionType);
            if (normalizedType == null)
            {
                return;
            }

            var timeToExpiration = GetTimeToExpirationYears(valuationDateUtc, expirationDate);
            if (timeToExpiration <= 0d)
            {
                return;
            }

            var forwardPrice = underlyingPrice;
            if (!forwardPrice.HasValue)
            {
                var optionPrice = ResolveOptionPrice(point);
                if (!optionPrice.HasValue)
                {
                    return;
                }

                forwardPrice = Black76.TryImplyForwardPrice(
                    normalizedType == "C",
                    optionPrice.Value,
                    point.Strike.Value,
                    point.ImpliedVolatility.Value,
                    riskFreeRate,
                    timeToExpiration);
            }

            if (!forwardPrice.HasValue)
            {
                return;
            }

            var greeks = Black76.TryCalculate(
                normalizedType == "C",
                forwardPrice.Value,
                point.Strike.Value,
                point.ImpliedVolatility.Value,
                riskFreeRate,
                timeToExpiration,
                DefaultDayCount);

            if (greeks == null)
            {
                return;
            }

            point.Delta = greeks.Delta;
            point.Gamma = greeks.Gamma;
            point.Vega = greeks.Vega;
            point.Theta = greeks.Theta;
            point.Rho = greeks.Rho;
        }

        private static double GetTimeToExpirationYears(DateTime valuationDateUtc, DateTime expirationDate)
        {
            var days = (expirationDate.Date - valuationDateUtc.Date).TotalDays;
            if (days <= 0d)
            {
                return 0d;
            }

            return days / DefaultDayCount;
        }

        private static decimal? ResolveOptionPrice(OptionSmilePoint point)
        {
            if (point.TheorPrice.HasValue && point.TheorPrice.Value > 0m)
            {
                return point.TheorPrice.Value;
            }

            if (point.Last.HasValue && point.Last.Value > 0m)
            {
                return point.Last.Value;
            }

            if (point.Bid.HasValue && point.Offer.HasValue && point.Bid.Value > 0m && point.Offer.Value > 0m)
            {
                return (point.Bid.Value + point.Offer.Value) / 2m;
            }

            return null;
        }

        private static decimal? ResolveForwardPriceFromPoints(
            IEnumerable<OptionSmilePoint> points,
            DateTime valuationDateUtc,
            DateTime expirationDate,
            decimal riskFreeRate)
        {
            var timeToExpiration = GetTimeToExpirationYears(valuationDateUtc, expirationDate);
            if (timeToExpiration <= 0d)
            {
                return null;
            }

            foreach (var point in points)
            {
                var normalizedType = NormalizeOptionType(point.OptionType);
                if (normalizedType == null || !point.Strike.HasValue || !point.ImpliedVolatility.HasValue)
                {
                    continue;
                }

                var price = ResolveOptionPrice(point);
                if (!price.HasValue)
                {
                    continue;
                }

                var forward = Black76.TryImplyForwardPrice(
                    normalizedType == "C",
                    price.Value,
                    point.Strike.Value,
                    point.ImpliedVolatility.Value,
                    riskFreeRate,
                    timeToExpiration);

                if (forward.HasValue && forward.Value > 0m)
                {
                    return forward;
                }
            }

            return null;
        }

        private async Task<decimal?> ResolveMoexUnderlyingPriceAsync(string assetCode, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(assetCode))
            {
                return null;
            }

            var rows = await _moexApiService.GetOptionsAsync(assetCode, cancellationToken);
            if (rows.Count == 0)
            {
                return null;
            }

            return rows
                .Select(r => r.UnderlyingPrice)
                .FirstOrDefault(p => p.HasValue);
        }

        private async Task<decimal?> ResolveUnderlyingPriceAsync(
            string assetCode,
            DateTime expirationDate,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(assetCode))
            {
                return null;
            }

            var normalized = assetCode.Trim().ToUpperInvariant();

            var futures = await _dbContext.FutureSpecs
                .AsNoTracking()
                .Where(f => f.AssetCode == normalized && f.ExpirationDate.HasValue)
                .Select(f => new { f.DictionaryId, Expiration = f.ExpirationDate!.Value })
                .ToListAsync(cancellationToken);

            if (futures.Count > 0)
            {
                var chosen = futures
                    .OrderBy(f => f.Expiration.Date < expirationDate.Date ? 1 : 0)
                    .ThenBy(f => Math.Abs((f.Expiration.Date - expirationDate.Date).TotalDays))
                    .First();

                var futurePrice = await GetLastCloseAsync(chosen.DictionaryId, cancellationToken);
                if (futurePrice.HasValue && futurePrice.Value > 0m)
                {
                    return futurePrice;
                }
            }

            var spotSecId = await _dbContext.UnderlyingMaps
                .AsNoTracking()
                .Where(m => m.AssetCode == normalized)
                .Select(m => m.SpotSecId)
                .FirstOrDefaultAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(spotSecId))
            {
                return null;
            }

            var spotId = await _dbContext.Dictionaries
                .AsNoTracking()
                .Where(d => d.Market == MarketStocks && d.Securityid == spotSecId)
                .Select(d => (int?)d.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!spotId.HasValue)
            {
                return null;
            }

            var spotPrice = await GetLastCloseAsync(spotId.Value, cancellationToken);
            if (spotPrice.HasValue && spotPrice.Value > 0m)
            {
                return spotPrice;
            }

            return null;
        }

        private async Task<decimal?> GetLastCloseAsync(int dictionaryId, CancellationToken cancellationToken)
        {
            return await _dbContext.DayCandles
                .AsNoTracking()
                .Where(c => c.Id == dictionaryId)
                .OrderByDescending(c => c.Period)
                .Select(c => (decimal?)c.ClsPrice)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private static string? NormalizeOptionType(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var normalized = value.Trim().ToUpperInvariant();
            if (normalized == "CALL")
            {
                return "C";
            }

            if (normalized == "PUT")
            {
                return "P";
            }

            if (normalized.StartsWith("C", StringComparison.Ordinal))
            {
                return "C";
            }

            if (normalized.StartsWith("P", StringComparison.Ordinal))
            {
                return "P";
            }

            return null;
        }

        private static DateTime NormalizeAsOf(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
        }
    }
}
