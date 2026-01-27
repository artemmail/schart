using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StatementsController : ControllerBase
    {
        private readonly IFinancialStatementsService _service;
        private readonly ApplicationDbContext _db;

        public StatementsController(
            IFinancialStatementsService service,
            ApplicationDbContext db)
        {
            _service = service;
            _db = db;
        }

        [HttpGet("{ticker}")]
        public async Task<ActionResult<IReadOnlyList<FinancialStatementEntryDto>>> Get(
            string ticker,
            [FromQuery(Name = "standart")] string? standard,
            [FromQuery] string? period,
            [FromQuery] string? mode,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            var result = await _service.GetStatementsAsync(
                ticker,
                standard ?? "MSFO",
                period ?? "y",
                mode ?? "raw",
                cancellationToken);

            return Ok(result);
        }

        [HttpGet("{marketCode}/{ticker}/available")]
        public async Task<ActionResult<StatementsAvailabilityDto>> Available(
            string marketCode,
            string ticker,
            CancellationToken cancellationToken)
        {
            if (!TryParseMarketCode(marketCode, out var marketId))
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "marketCode must be a numeric code.");
            }

            if (string.IsNullOrWhiteSpace(ticker))
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "ticker is required.");
            }

            var normalizedTicker = ticker.Trim().ToUpperInvariant();

            var dic = await _db.Dictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Market == marketId && d.Securityid == normalizedTicker, cancellationToken);

            if (dic == null)
            {
                return Error(StatusCodes.Status404NotFound, "NOT_FOUND", "Stock not found.");
            }

            var dto = await BuildAvailabilityAsync(marketCode, dic.Id, normalizedTicker, cancellationToken);
            return Ok(dto);
        }

        [HttpGet("{marketCode}/{ticker}/series/{metricKey}")]
        public async Task<ActionResult<MetricSeriesDto>> Series(
            string marketCode,
            string ticker,
            string metricKey,
            [FromQuery] string? standard,
            [FromQuery] string? period,
            [FromQuery] string? mode,
            [FromQuery] int? limit,
            CancellationToken cancellationToken)
        {
            if (!TryParseMarketCode(marketCode, out var marketId))
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "marketCode must be a numeric code.");
            }

            if (string.IsNullOrWhiteSpace(ticker))
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "ticker is required.");
            }

            if (string.IsNullOrWhiteSpace(metricKey))
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "metricKey is required.");
            }

            var normalizedTicker = ticker.Trim().ToUpperInvariant();
            var normalizedMetricKey = metricKey.Trim();

            var requestedLimit = limit ?? 50;
            if (requestedLimit <= 0)
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "limit must be > 0.");
            }

            var effectiveLimit = Math.Min(requestedLimit, 200);

            var normalizedStandard = string.IsNullOrWhiteSpace(standard) ? "MSFO" : standard.Trim().ToUpperInvariant();
            var normalizedPeriod = NormalizeFundamentalPeriod(period);
            if (normalizedPeriod == null)
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "period must be annual|quarter|ltm.");
            }

            var normalizedMode = string.IsNullOrWhiteSpace(mode) ? "raw" : mode.Trim().ToLowerInvariant();

            var dic = await _db.Dictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Market == marketId && d.Securityid == normalizedTicker, cancellationToken);

            if (dic == null)
            {
                return Error(StatusCodes.Status404NotFound, "NOT_FOUND", "Stock not found.");
            }

            var metric = await _db.FinancialStatementDictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Code == normalizedMetricKey, cancellationToken);

            var entriesQuery = _db.FinancialStatementEntries
                .AsNoTracking()
                .Where(e => e.DictionaryId == dic.Id && e.Standard == normalizedStandard);

            entriesQuery = metric != null
                ? entriesQuery.Where(e => e.MetricId == metric.Id)
                : entriesQuery.Where(e => e.Name == normalizedMetricKey);

            var rawEntries = await entriesQuery
                .Select(e => new { e.Year, e.ValueRaw, e.ValueNum })
                .ToListAsync(cancellationToken);

            var pointsWithKey = new List<(int key, MetricPointDto point)>(rawEntries.Count);
            foreach (var row in rawEntries)
            {
                if (!TryBuildPoint(normalizedPeriod, row.Year, row.ValueRaw, row.ValueNum, out var sortKey, out var point))
                {
                    continue;
                }

                pointsWithKey.Add((sortKey, point));
            }

            pointsWithKey.Sort((a, b) => a.key.CompareTo(b.key));

            var rowsTotal = pointsWithKey.Count;
            var truncated = rowsTotal > effectiveLimit || requestedLimit > effectiveLimit;

            if (rowsTotal > effectiveLimit)
            {
                pointsWithKey = pointsWithKey.Skip(rowsTotal - effectiveLimit).ToList();
            }

            var points = pointsWithKey.Select(p => p.point).ToList();

            // If the metric isn't in the catalog and there is no data for it, report NOT_FOUND.
            if (metric == null && rowsTotal == 0)
            {
                return Error(StatusCodes.Status404NotFound, "NOT_FOUND", "Metric not found.");
            }

            return new MetricSeriesDto
            {
                MarketCode = marketCode,
                Ticker = normalizedTicker,
                MetricKey = normalizedMetricKey,
                DisplayName = metric?.Value ?? normalizedMetricKey,
                ValueType = string.IsNullOrWhiteSpace(metric?.ValueType) ? "number" : metric.ValueType,
                Unit = metric?.Unit,
                Standard = normalizedStandard,
                Period = normalizedPeriod,
                Mode = normalizedMode,
                Points = points,
                Meta = CreateMeta(points.Count, rowsTotal, truncated)
            };
        }

        [HttpPost("series/batch")]
        public async Task<ActionResult<BatchSeriesResponseDto>> BatchSeries(
            [FromBody] BatchSeriesRequestDto request,
            CancellationToken cancellationToken)
        {
            if (request?.Items == null)
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Request body is required.");
            }

            if (request.Items.Count > 50)
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "items max is 50.");
            }

            var results = new List<MetricSeriesDto>();
            var errors = new List<BatchSeriesErrorDto>();

            for (var i = 0; i < request.Items.Count; i++)
            {
                var item = request.Items[i];
                if (item == null)
                {
                    errors.Add(new BatchSeriesErrorDto { Index = i, Code = "VALIDATION_ERROR", Message = "Item is null." });
                    continue;
                }

                if (string.IsNullOrWhiteSpace(item.MarketCode)
                    || string.IsNullOrWhiteSpace(item.Ticker)
                    || string.IsNullOrWhiteSpace(item.MetricKey))
                {
                    errors.Add(new BatchSeriesErrorDto { Index = i, Code = "VALIDATION_ERROR", Message = "marketCode, ticker and metricKey are required." });
                    continue;
                }

                // Reuse the single-series logic by calling the in-process method.
                var action = await Series(
                    item.MarketCode,
                    item.Ticker,
                    item.MetricKey,
                    item.Standard,
                    item.Period,
                    item.Mode,
                    item.Limit,
                    cancellationToken);

                if (action.Result is ObjectResult objectResult
                    && objectResult.Value is ApiErrorResponseDto apiError)
                {
                    errors.Add(new BatchSeriesErrorDto
                    {
                        Index = i,
                        Code = apiError.Error.Code,
                        Message = apiError.Error.Message
                    });
                    continue;
                }

                if (action.Value != null)
                {
                    results.Add(action.Value);
                }
                else
                {
                    errors.Add(new BatchSeriesErrorDto { Index = i, Code = "INTERNAL_ERROR", Message = "Unexpected batch item result." });
                }
            }

            return Ok(new BatchSeriesResponseDto
            {
                Results = results,
                Errors = errors,
                Meta = CreateMeta(results.Count, request.Items.Count, truncated: errors.Count > 0)
            });
        }

        private async Task<StatementsAvailabilityDto> BuildAvailabilityAsync(
            string marketCode,
            int dictionaryId,
            string ticker,
            CancellationToken cancellationToken)
        {
            var entries = await _db.FinancialStatementEntries
                .AsNoTracking()
                .Where(e => e.DictionaryId == dictionaryId)
                .Select(e => new { e.Standard, e.Period, e.Year, e.ImportedAt })
                .ToListAsync(cancellationToken);

            var standards = entries
                .Select(e => e.Standard)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var periods = new List<string>();
            if (entries.Any(e => string.Equals(e.Period, "y", StringComparison.OrdinalIgnoreCase)))
            {
                periods.Add("annual");
            }
            if (entries.Any(e => string.Equals(e.Period, "q", StringComparison.OrdinalIgnoreCase)))
            {
                periods.Add("quarter");
            }
            if (entries.Any(e => e.Year != null
                && (e.Year.Contains("LTM", StringComparison.OrdinalIgnoreCase) || e.Year.Contains("LTR", StringComparison.OrdinalIgnoreCase))))
            {
                periods.Add("ltm");
            }

            var annualYears = entries
                .Where(e => string.Equals(e.Period, "y", StringComparison.OrdinalIgnoreCase))
                .Select(e => e.Year)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            YearRangeDto? annualRange = null;
            var annualParsed = annualYears
                .Select(y => int.TryParse(y, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? (int?)v : null)
                .Where(v => v.HasValue)
                .Select(v => v!.Value)
                .ToList();

            if (annualParsed.Count > 0)
            {
                annualRange = new YearRangeDto
                {
                    FromYear = annualParsed.Min(),
                    ToYear = annualParsed.Max()
                };
            }

            var quarterYears = entries
                .Where(e => string.Equals(e.Period, "q", StringComparison.OrdinalIgnoreCase))
                .Select(e => e.Year)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            QuarterRangeDto? quarterRange = null;
            var quarterParsed = quarterYears
                .Select(y => TryParseQuarterKey(y, out var key, out var normalized) ? new { key, normalized } : null)
                .Where(x => x != null)
                .Select(x => x!)
                .OrderBy(x => x.key)
                .ToList();

            if (quarterParsed.Count > 0)
            {
                quarterRange = new QuarterRangeDto
                {
                    From = quarterParsed.First().normalized,
                    To = quarterParsed.Last().normalized
                };
            }

            var lastUpdated = entries.Count > 0 ? entries.Max(e => e.ImportedAt) : (DateTime?)null;

            return new StatementsAvailabilityDto
            {
                MarketCode = marketCode,
                Ticker = ticker,
                Standards = standards,
                PeriodsSupported = periods.ToArray(),
                AnnualRange = annualRange,
                QuarterRange = quarterRange,
                LastUpdatedUtc = lastUpdated?.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture)
            };
        }

        private static string? NormalizeFundamentalPeriod(string? period)
        {
            if (string.IsNullOrWhiteSpace(period))
            {
                return "annual";
            }

            return period.Trim().ToLowerInvariant() switch
            {
                "annual" => "annual",
                "quarter" => "quarter",
                "ltm" => "ltm",
                _ => null
            };
        }

        private static bool TryBuildPoint(
            string period,
            string? year,
            string? valueRaw,
            decimal? valueNum,
            out int sortKey,
            out MetricPointDto point)
        {
            point = new MetricPointDto();
            sortKey = 0;

            if (!TryBuildX(period, year, out var x, out sortKey))
            {
                return false;
            }

            var num = valueNum ?? TryParseNumeric(valueRaw);
            point = new MetricPointDto
            {
                X = x,
                ValueNum = num,
                ValueRaw = valueRaw
            };

            return true;
        }

        private static bool TryBuildX(string period, string? year, out string x, out int sortKey)
        {
            x = string.Empty;
            sortKey = 0;

            if (string.IsNullOrWhiteSpace(year))
            {
                return false;
            }

            var compact = new string(year.Trim().Where(c => !char.IsWhiteSpace(c)).ToArray());
            if (string.IsNullOrWhiteSpace(compact))
            {
                return false;
            }

            if (period == "annual")
            {
                if (compact.Length == 4 && int.TryParse(compact, NumberStyles.Integer, CultureInfo.InvariantCulture, out var y))
                {
                    x = compact;
                    sortKey = y * 10 + 9;
                    return true;
                }

                return false;
            }

            if (period == "quarter")
            {
                var up = compact.ToUpperInvariant();
                if (up.Length == 6
                    && up[4] == 'Q'
                    && int.TryParse(up[..4], NumberStyles.Integer, CultureInfo.InvariantCulture, out var y)
                    && int.TryParse(up[5..], NumberStyles.Integer, CultureInfo.InvariantCulture, out var q)
                    && q is >= 1 and <= 4)
                {
                    x = $"{y}Q{q}";
                    sortKey = y * 10 + q;
                    return true;
                }

                return false;
            }

            if (period == "ltm")
            {
                var up = compact.ToUpperInvariant();

                // Accept common variants: LTM-YYYYQn, LTMYYYYQn, LTR-YYYYQn, YYYYQnLTM.
                string? tail = null;

                if (up.StartsWith("LTM", StringComparison.OrdinalIgnoreCase) || up.StartsWith("LTR", StringComparison.OrdinalIgnoreCase))
                {
                    tail = up.StartsWith("LTM-", StringComparison.OrdinalIgnoreCase) || up.StartsWith("LTR-", StringComparison.OrdinalIgnoreCase)
                        ? up[4..]
                        : up[3..];
                }
                else if (up.EndsWith("LTM", StringComparison.OrdinalIgnoreCase) || up.EndsWith("LTR", StringComparison.OrdinalIgnoreCase))
                {
                    tail = up.EndsWith("-LTM", StringComparison.OrdinalIgnoreCase) || up.EndsWith("-LTR", StringComparison.OrdinalIgnoreCase)
                        ? up[..^4]
                        : up[..^3];
                }

                if (tail != null)
                {
                    tail = tail.TrimStart('-', '_');
                    if (tail.Length == 6
                        && tail[4] == 'Q'
                        && int.TryParse(tail[..4], NumberStyles.Integer, CultureInfo.InvariantCulture, out var y)
                        && int.TryParse(tail[5..], NumberStyles.Integer, CultureInfo.InvariantCulture, out var q)
                        && q is >= 1 and <= 4)
                    {
                        x = $"LTM-{y}Q{q}";
                        sortKey = y * 10 + q;
                        return true;
                    }
                }

                return false;
            }

            return false;
        }

        private static decimal? TryParseNumeric(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var cleaned = new string(value.Where(c => !char.IsWhiteSpace(c)).ToArray());
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                return null;
            }

            cleaned = cleaned.Replace("%", string.Empty).Replace(',', '.');
            if (string.IsNullOrWhiteSpace(cleaned) || cleaned is "-" or "—")
            {
                return null;
            }

            return decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed)
                ? parsed
                : null;
        }

        private static bool TryParseMarketCode(string marketCode, out byte marketId)
        {
            return byte.TryParse(marketCode, NumberStyles.Integer, CultureInfo.InvariantCulture, out marketId);
        }

        private static bool TryParseQuarterKey(string? value, out int key, out string normalized)
        {
            key = 0;
            normalized = string.Empty;
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var s = new string(value.Trim().Where(c => !char.IsWhiteSpace(c)).ToArray());
            if (s.Length != 6 || !s.Contains('Q', StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var parts = s.Split('Q', 'q');
            if (parts.Length != 2
                || !int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var year)
                || !int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var quarter)
                || quarter < 1
                || quarter > 4)
            {
                return false;
            }

            normalized = $"{year}Q{quarter}";
            key = year * 10 + quarter;
            return true;
        }

        private ApiMetaDto CreateMeta(int rowsReturned, int? rowsTotal, bool truncated)
        {
            return new ApiMetaDto
            {
                RequestId = HttpContext.TraceIdentifier,
                RowsReturned = rowsReturned,
                RowsTotal = rowsTotal,
                Truncated = truncated,
                NextCursor = null,
                ServerTimeUtc = DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture),
                Source = new[] { "db" }
            };
        }

        private ObjectResult Error(int statusCode, string code, string message, object? details = null)
        {
            return StatusCode(statusCode, new ApiErrorResponseDto
            {
                Error = new ApiErrorDto
                {
                    Code = code,
                    Message = message,
                    Details = details ?? new { }
                }
            });
        }
    }
}
