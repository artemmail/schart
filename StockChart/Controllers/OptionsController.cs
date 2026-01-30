using System;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/options")]
    public sealed class OptionsController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;

        public OptionsController(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
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

                var points = await (from spec in specQuery
                        join dic in dictQuery on spec.DictionaryId equals dic.Id
                        join snap in snapshotQuery on spec.DictionaryId equals snap.DictionaryId
                        select new OptionSmilePoint
                        {
                            SecurityId = dic.Securityid,
                            OptionType = !string.IsNullOrWhiteSpace(snap.OptionType) ? snap.OptionType : spec.OptionType,
                            BoardId = snap.BoardId ?? spec.BoardId,
                            Strike = snap.Strike ?? spec.Strike,
                            ImpliedVolatility = snap.Volat ?? spec.Volat,
                            TheorPrice = snap.TheorPrice ?? spec.TheorPrice,
                            Last = snap.Last ?? spec.Last,
                            Bid = snap.Bid ?? spec.Bid,
                            Offer = snap.Offer ?? spec.Offer,
                            VolToday = snap.VolToday ?? spec.VolToday,
                            OpenPosition = snap.OpenPosition ?? spec.OpenPosition
                        })
                    .OrderBy(p => p.OptionType)
                    .ThenBy(p => p.Strike)
                    .ToListAsync(cancellationToken);

                if (points.Count == 0)
                {
                    return NotFound();
                }

                return Ok(new OptionSmileResponse
                {
                    AssetCode = assetCode,
                    ExpirationDate = expirationDate.Date,
                    AsOf = asOfUtc,
                    Points = points
                });
            }

            var currentPoints = await (from spec in specQuery
                    join dic in dictQuery on spec.DictionaryId equals dic.Id
                    select new OptionSmilePoint
                    {
                        SecurityId = dic.Securityid,
                        OptionType = spec.OptionType,
                        BoardId = spec.BoardId,
                        Strike = spec.Strike,
                        ImpliedVolatility = spec.Volat,
                        TheorPrice = spec.TheorPrice,
                        Last = spec.Last,
                        Bid = spec.Bid,
                        Offer = spec.Offer,
                        VolToday = spec.VolToday,
                        OpenPosition = spec.OpenPosition
                    })
                .OrderBy(p => p.OptionType)
                .ThenBy(p => p.Strike)
                .ToListAsync(cancellationToken);

            if (currentPoints.Count == 0)
            {
                return NotFound();
            }

            return Ok(new OptionSmileResponse
            {
                AssetCode = assetCode,
                ExpirationDate = expirationDate.Date,
                Points = currentPoints
            });
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
