using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using DictionaryEntity = StockChart.Model.Dictionary;

namespace StockChart.Controllers;

[ApiController]
[Route("api/dictionary")]
public sealed class DictionaryController : ControllerBase
{
    private const int StocksDefaultLimit = 50;
    private const int StocksHardMax = 200;

    private const int SectorsDefaultLimit = 200;
    private const int SectorsHardMax = 1000;

    private const int MetricsDefaultLimit = 100;
    private const int MetricsHardMax = 500;

    private readonly ApplicationDbContext _db;

    public DictionaryController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("markets")]
    public async Task<ActionResult<IReadOnlyList<MarketDto>>> GetMarkets(CancellationToken cancellationToken)
    {
        var markets = await _db.Markets
            .AsNoTracking()
            .Where(m => m.Visible)
            .OrderBy(m => m.Id)
            .Select(m => new MarketDto
            {
                MarketCode = m.Id.ToString(CultureInfo.InvariantCulture),
                MarketName = m.Name,
                Source = "StockChart"
            })
            .ToListAsync(cancellationToken);

        return Ok(markets);
    }

    [HttpGet("markets/{marketCode}")]
    public async Task<ActionResult<MarketDetailsDto>> GetMarketDetails(string marketCode, CancellationToken cancellationToken)
    {
        if (!TryParseMarketCode(marketCode, out var marketId))
        {
            return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "marketCode must be a numeric code.");
        }

        var market = await _db.Markets
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == marketId && m.Visible, cancellationToken);

        if (market == null)
        {
            return Error(StatusCodes.Status404NotFound, "NOT_FOUND", "Market not found.");
        }

        // The current DB schema only has one classification level (CategoryType). We expose it for both sectors
        // and industries to keep MCP contracts usable.
        var supportsIndustry = await _db.CategoryTypes.AsNoTracking().AnyAsync(cancellationToken);

        return Ok(new MarketDetailsDto
        {
            Market = new MarketDto
            {
                MarketCode = market.Id.ToString(CultureInfo.InvariantCulture),
                MarketName = market.Name,
                Source = "StockChart"
            },
            SupportsSectors = supportsIndustry,
            SupportsIndustries = supportsIndustry,
            SupportsStatements = true,
            SupportsDividends = true,
            SupportsShareholders = true,
            SupportsRecommendations = true
        });
    }

    [HttpGet("stocks")]
    public async Task<ActionResult<ApiListResponseDto<StockDto>>> SearchStocks(
        [FromQuery] string? q,
        [FromQuery] string? marketCode,
        [FromQuery] string? sectorKey,
        [FromQuery] string? industryKey,
        [FromQuery] bool? isActive,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken cancellationToken)
    {
        var effectiveOffset = Math.Max(0, offset ?? 0);
        var requestedLimit = limit ?? StocksDefaultLimit;
        if (requestedLimit <= 0)
        {
            return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "limit must be > 0.");
        }

        var effectiveLimit = Math.Min(requestedLimit, StocksHardMax);

        var query = BuildStocksQuery(q, marketCode, sectorKey, industryKey, isActive, out var validationError);
        if (validationError != null)
        {
            return validationError;
        }

        var now = DateTime.UtcNow;
        var rowsTotal = await query.CountAsync(cancellationToken);

        var page = await query
            .OrderBy(d => d.Securityid)
            .Skip(effectiveOffset)
            .Take(effectiveLimit)
            .Select(d => new StockDto
            {
                Ticker = d.Securityid,
                Name = d.Fullname ?? d.Shortname,
                MarketCode = d.Market.HasValue ? d.Market.Value.ToString(CultureInfo.InvariantCulture) : string.Empty,
                SectorKey = d.CategoryTypeId.HasValue ? d.CategoryTypeId.Value.ToString(CultureInfo.InvariantCulture) : null,
                SectorName = d.CategoryType != null ? d.CategoryType.Name : null,
                IndustryKey = d.CategoryTypeId.HasValue ? d.CategoryTypeId.Value.ToString(CultureInfo.InvariantCulture) : null,
                IndustryName = d.CategoryType != null ? d.CategoryType.Name : null,
                Isin = d.Isin,
                Currency = d.Currency,
                IsActive = (!d.FromDate.HasValue || d.FromDate.Value <= now)
                    && (!d.ToDate.HasValue || d.ToDate.Value >= now),
                Source = "StockChart"
            })
            .ToListAsync(cancellationToken);

        var rowsReturned = page.Count;
        var truncated = (effectiveOffset + rowsReturned) < rowsTotal || requestedLimit > effectiveLimit;

        return Ok(new ApiListResponseDto<StockDto>
        {
            Meta = CreateMeta(rowsReturned, rowsTotal, truncated),
            Data = page
        });
    }

    [HttpGet("stocks/{marketCode}/{ticker}")]
    public async Task<ActionResult<StockDetailsDto>> GetStockDetails(
        string marketCode,
        string ticker,
        [FromQuery] bool? includeAvailable,
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
            .Include(d => d.CategoryType)
            .Include(d => d.MarketNavigation)
            .FirstOrDefaultAsync(d => d.Market == marketId && d.Securityid == normalizedTicker, cancellationToken);

        if (dic == null)
        {
            return Error(StatusCodes.Status404NotFound, "NOT_FOUND", "Stock not found.");
        }

        var details = new StockDetailsDto
        {
            Stock = MapStockDto(dic)
        };

        if (includeAvailable.GetValueOrDefault(true))
        {
            details.Available = await BuildAvailabilityAsync(marketCode, dic.Id, normalizedTicker, cancellationToken);
        }

        return Ok(details);
    }

    [HttpGet("sectors")]
    public async Task<ActionResult<ApiListResponseDto<SectorDto>>> ListSectors(
        [FromQuery] string? marketCode,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken cancellationToken)
    {
        // NOTE: The current DB has only CategoryType; we expose it as both sector and industry.
        var effectiveOffset = Math.Max(0, offset ?? 0);
        var requestedLimit = limit ?? SectorsDefaultLimit;
        if (requestedLimit <= 0)
        {
            return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "limit must be > 0.");
        }

        var effectiveLimit = Math.Min(requestedLimit, SectorsHardMax);

        IQueryable<CategoryType> query = _db.CategoryTypes.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(marketCode))
        {
            if (!TryParseMarketCode(marketCode, out var marketId))
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "marketCode must be a numeric code.");
            }

            query = query.Where(c => c.Market == marketId || c.Market == null);
        }

        var rowsTotal = await query.CountAsync(cancellationToken);

        var page = await query
            .OrderBy(c => c.Name)
            .Skip(effectiveOffset)
            .Take(effectiveLimit)
            .Select(c => new SectorDto
            {
                SectorKey = c.Id.ToString(CultureInfo.InvariantCulture),
                SectorName = c.Name,
                MarketCode = c.Market.HasValue ? c.Market.Value.ToString(CultureInfo.InvariantCulture) : null
            })
            .ToListAsync(cancellationToken);

        var rowsReturned = page.Count;
        var truncated = (effectiveOffset + rowsReturned) < rowsTotal || requestedLimit > effectiveLimit;

        return Ok(new ApiListResponseDto<SectorDto>
        {
            Meta = CreateMeta(rowsReturned, rowsTotal, truncated),
            Data = page
        });
    }

    [HttpGet("industries")]
    public async Task<ActionResult<ApiListResponseDto<IndustryDto>>> ListIndustries(
        [FromQuery] string? marketCode,
        [FromQuery] string? sectorKey,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken cancellationToken)
    {
        var effectiveOffset = Math.Max(0, offset ?? 0);
        var requestedLimit = limit ?? SectorsDefaultLimit;
        if (requestedLimit <= 0)
        {
            return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "limit must be > 0.");
        }

        var effectiveLimit = Math.Min(requestedLimit, SectorsHardMax);

        IQueryable<CategoryType> query = _db.CategoryTypes.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(marketCode))
        {
            if (!TryParseMarketCode(marketCode, out var marketId))
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "marketCode must be a numeric code.");
            }

            query = query.Where(c => c.Market == marketId || c.Market == null);
        }

        // With a single-level classification we treat sectorKey as an alias of industryKey.
        if (!string.IsNullOrWhiteSpace(sectorKey))
        {
            if (!int.TryParse(sectorKey, NumberStyles.Integer, CultureInfo.InvariantCulture, out var sectorId))
            {
                return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "sectorKey must be a numeric key.");
            }

            query = query.Where(c => c.Id == sectorId);
        }

        var rowsTotal = await query.CountAsync(cancellationToken);

        var page = await query
            .OrderBy(c => c.Name)
            .Skip(effectiveOffset)
            .Take(effectiveLimit)
            .Select(c => new IndustryDto
            {
                IndustryKey = c.Id.ToString(CultureInfo.InvariantCulture),
                IndustryName = c.Name,
                SectorKey = c.Id.ToString(CultureInfo.InvariantCulture),
                MarketCode = c.Market.HasValue ? c.Market.Value.ToString(CultureInfo.InvariantCulture) : null
            })
            .ToListAsync(cancellationToken);

        var rowsReturned = page.Count;
        var truncated = (effectiveOffset + rowsReturned) < rowsTotal || requestedLimit > effectiveLimit;

        return Ok(new ApiListResponseDto<IndustryDto>
        {
            Meta = CreateMeta(rowsReturned, rowsTotal, truncated),
            Data = page
        });
    }

    [HttpGet("sectors/{sectorKey}/stocks")]
    public Task<ActionResult<ApiListResponseDto<StockDto>>> ListStocksBySector(
        string sectorKey,
        [FromQuery] string? marketCode,
        [FromQuery] bool? isActive,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken cancellationToken)
    {
        return SearchStocks(
            q: null,
            marketCode: marketCode,
            sectorKey: sectorKey,
            industryKey: null,
            isActive: isActive,
            limit: limit,
            offset: offset,
            cancellationToken: cancellationToken);
    }

    [HttpGet("industries/{industryKey}/stocks")]
    public Task<ActionResult<ApiListResponseDto<StockDto>>> ListStocksByIndustry(
        string industryKey,
        [FromQuery] string? marketCode,
        [FromQuery] bool? isActive,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken cancellationToken)
    {
        return SearchStocks(
            q: null,
            marketCode: marketCode,
            sectorKey: null,
            industryKey: industryKey,
            isActive: isActive,
            limit: limit,
            offset: offset,
            cancellationToken: cancellationToken);
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<ApiListResponseDto<MetricDto>>> ListMetrics(
        [FromQuery] string? q,
        [FromQuery] string? valueType,
        [FromQuery] string? unit,
        [FromQuery] string? statementType,
        [FromQuery] string? periodSupport,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken cancellationToken)
    {
        var effectiveOffset = Math.Max(0, offset ?? 0);
        var requestedLimit = limit ?? MetricsDefaultLimit;
        if (requestedLimit <= 0)
        {
            return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "limit must be > 0.");
        }

        var effectiveLimit = Math.Min(requestedLimit, MetricsHardMax);

        IQueryable<FinancialStatementDictionary> query = _db.FinancialStatementDictionaries
            .AsNoTracking()
            .Where(m => m.IsActive);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim();
            query = query.Where(m =>
                EF.Functions.Like(m.Code, $"%{needle}%")
                || EF.Functions.Like(m.Value, $"%{needle}%")
                || (m.Tooltip != null && EF.Functions.Like(m.Tooltip, $"%{needle}%")));
        }

        if (!string.IsNullOrWhiteSpace(valueType))
        {
            var vt = valueType.Trim();
            query = query.Where(m => m.ValueType == vt);
        }

        if (!string.IsNullOrWhiteSpace(unit))
        {
            var u = unit.Trim();
            query = query.Where(m => m.Unit == u);
        }

        if (!string.IsNullOrWhiteSpace(statementType))
        {
            var st = statementType.Trim();
            query = query.Where(m => m.SortGroup == st);
        }

        if (!string.IsNullOrWhiteSpace(periodSupport))
        {
            var ps = periodSupport.Trim().ToLowerInvariant();
            switch (ps)
            {
                case "annual":
                    query = query.Where(m => _db.FinancialStatementEntries.Any(e => e.MetricId == m.Id && e.Period == "y"));
                    break;
                case "quarter":
                    query = query.Where(m => _db.FinancialStatementEntries.Any(e => e.MetricId == m.Id && e.Period == "q"));
                    break;
                case "ltm":
                    query = query.Where(m => _db.FinancialStatementEntries.Any(e =>
                        e.MetricId == m.Id && (EF.Functions.Like(e.Year, "%LTM%") || EF.Functions.Like(e.Year, "%LTR%"))));
                    break;
                default:
                    return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "periodSupport must be annual|quarter|ltm.");
            }
        }

        var rowsTotal = await query.CountAsync(cancellationToken);

        var page = await query
            .OrderBy(m => m.SortGroup)
            .ThenBy(m => m.Code)
            .Skip(effectiveOffset)
            .Take(effectiveLimit)
            .Select(m => new MetricDto
            {
                MetricKey = m.Code,
                DisplayName = m.Value,
                Description = m.Tooltip,
                ValueType = string.IsNullOrWhiteSpace(m.ValueType) ? "number" : m.ValueType,
                Unit = m.Unit,
                StatementType = m.SortGroup,
                Source = "StockChart"
            })
            .ToListAsync(cancellationToken);

        var rowsReturned = page.Count;
        var truncated = (effectiveOffset + rowsReturned) < rowsTotal || requestedLimit > effectiveLimit;

        return Ok(new ApiListResponseDto<MetricDto>
        {
            Meta = CreateMeta(rowsReturned, rowsTotal, truncated),
            Data = page
        });
    }

    [HttpGet("metrics/{metricKey}")]
    public async Task<ActionResult<MetricDetailsDto>> GetMetricDetails(string metricKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(metricKey))
        {
            return Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "metricKey is required.");
        }

        var key = metricKey.Trim();
        var metric = await _db.FinancialStatementDictionaries
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Code == key, cancellationToken);

        if (metric == null)
        {
            return Error(StatusCodes.Status404NotFound, "NOT_FOUND", "Metric not found.");
        }

        return Ok(new MetricDetailsDto
        {
            Metric = new MetricDto
            {
                MetricKey = metric.Code,
                DisplayName = metric.Value,
                Description = metric.Tooltip,
                ValueType = string.IsNullOrWhiteSpace(metric.ValueType) ? "number" : metric.ValueType,
                Unit = metric.Unit,
                StatementType = metric.SortGroup,
                Source = "StockChart"
            },
            Notes = metric.Tooltip
        });
    }

    private IQueryable<DictionaryEntity> BuildStocksQuery(
        string? q,
        string? marketCode,
        string? sectorKey,
        string? industryKey,
        bool? isActive,
        out ObjectResult? validationError)
    {
        validationError = null;

        IQueryable<DictionaryEntity> query = _db.Dictionaries
            .AsNoTracking()
            .Include(d => d.CategoryType)
            .Include(d => d.MarketNavigation)
            .Where(d => d.MarketNavigation != null && d.MarketNavigation.Visible);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim();
            query = query.Where(d =>
                EF.Functions.Like(d.Securityid, $"%{needle}%")
                || (d.Shortname != null && EF.Functions.Like(d.Shortname, $"%{needle}%"))
                || (d.Fullname != null && EF.Functions.Like(d.Fullname, $"%{needle}%"))
                || (d.Isin != null && EF.Functions.Like(d.Isin, $"%{needle}%")));
        }

        if (!string.IsNullOrWhiteSpace(marketCode))
        {
            if (!TryParseMarketCode(marketCode, out var marketId))
            {
                validationError = Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "marketCode must be a numeric code.");
                return query;
            }

            query = query.Where(d => d.Market == marketId);
        }

        // With a single-level classification we treat sectorKey as an alias of industryKey.
        var effectiveCategoryKey = !string.IsNullOrWhiteSpace(industryKey) ? industryKey : sectorKey;
        if (!string.IsNullOrWhiteSpace(effectiveCategoryKey))
        {
            if (!int.TryParse(effectiveCategoryKey, NumberStyles.Integer, CultureInfo.InvariantCulture, out var categoryId))
            {
                validationError = Error(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "industryKey/sectorKey must be a numeric key.");
                return query;
            }

            query = query.Where(d => d.CategoryTypeId == categoryId);
        }

        if (isActive.HasValue)
        {
            var now = DateTime.UtcNow;
            // EF can translate this simple predicate.
            query = isActive.Value
                ? query.Where(d => (!d.FromDate.HasValue || d.FromDate.Value <= now)
                    && (!d.ToDate.HasValue || d.ToDate.Value >= now))
                : query.Where(d => (d.FromDate.HasValue && d.FromDate.Value > now)
                    || (d.ToDate.HasValue && d.ToDate.Value < now));
        }

        return query;
    }

    private static StockDto MapStockDto(DictionaryEntity d)
    {
        var now = DateTime.UtcNow;
        var marketCode = d.Market.HasValue
            ? d.Market.Value.ToString(CultureInfo.InvariantCulture)
            : string.Empty;

        var categoryId = d.CategoryTypeId?.ToString(CultureInfo.InvariantCulture);
        var categoryName = d.CategoryType?.Name;

        return new StockDto
        {
            Ticker = d.Securityid,
            Name = d.Fullname ?? d.Shortname,
            MarketCode = marketCode,
            // Expose CategoryType for both levels until a real 2-level classification exists.
            SectorKey = categoryId,
            SectorName = categoryName,
            IndustryKey = categoryId,
            IndustryName = categoryName,
            Isin = d.Isin,
            Currency = d.Currency,
            IsActive = (!d.FromDate.HasValue || d.FromDate.Value <= now)
                && (!d.ToDate.HasValue || d.ToDate.Value >= now),
            Source = "StockChart"
        };
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
