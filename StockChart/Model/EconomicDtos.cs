using System.Text.Json.Serialization;

namespace StockChart.Model;

// Economic/Fundamental DTOs for MCP/LLM-friendly API contracts (see mcp.md).

public sealed class ApiMetaDto
{
    [JsonPropertyName("requestId")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("rows_returned")]
    public int RowsReturned { get; set; }

    [JsonPropertyName("rows_total")]
    public int? RowsTotal { get; set; }

    [JsonPropertyName("truncated")]
    public bool Truncated { get; set; }

    [JsonPropertyName("next_cursor")]
    public string? NextCursor { get; set; }

    [JsonPropertyName("server_time_utc")]
    public string ServerTimeUtc { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string[]? Source { get; set; }
}

public sealed class ApiListResponseDto<T>
{
    [JsonPropertyName("meta")]
    public ApiMetaDto Meta { get; set; } = new();

    [JsonPropertyName("data")]
    public IReadOnlyList<T> Data { get; set; } = Array.Empty<T>();
}

public sealed class ApiErrorResponseDto
{
    [JsonPropertyName("error")]
    public ApiErrorDto Error { get; set; } = new();
}

public sealed class ApiErrorDto
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("details")]
    public object? Details { get; set; }
}

public sealed class MarketDto
{
    [JsonPropertyName("marketCode")]
    public string MarketCode { get; set; } = string.Empty;

    [JsonPropertyName("marketName")]
    public string MarketName { get; set; } = string.Empty;

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("timezone")]
    public string? Timezone { get; set; }

    [JsonPropertyName("source")]
    public string? Source { get; set; }
}

public sealed class MarketDetailsDto
{
    [JsonPropertyName("market")]
    public MarketDto Market { get; set; } = new();

    [JsonPropertyName("supportsSectors")]
    public bool SupportsSectors { get; set; }

    [JsonPropertyName("supportsIndustries")]
    public bool SupportsIndustries { get; set; }

    [JsonPropertyName("supportsStatements")]
    public bool SupportsStatements { get; set; }

    [JsonPropertyName("supportsDividends")]
    public bool SupportsDividends { get; set; }

    [JsonPropertyName("supportsShareholders")]
    public bool SupportsShareholders { get; set; }

    [JsonPropertyName("supportsRecommendations")]
    public bool SupportsRecommendations { get; set; }
}

public sealed class StockDto
{
    [JsonPropertyName("ticker")]
    public string Ticker { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("marketCode")]
    public string MarketCode { get; set; } = string.Empty;

    [JsonPropertyName("sectorKey")]
    public string? SectorKey { get; set; }

    [JsonPropertyName("sectorName")]
    public string? SectorName { get; set; }

    [JsonPropertyName("industryKey")]
    public string? IndustryKey { get; set; }

    [JsonPropertyName("industryName")]
    public string? IndustryName { get; set; }

    [JsonPropertyName("isin")]
    public string? Isin { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }

    [JsonPropertyName("periodSupport")]
    public string[]? PeriodSupport { get; set; }

    [JsonPropertyName("source")]
    public string? Source { get; set; }
}

public sealed class StockDetailsDto
{
    [JsonPropertyName("stock")]
    public StockDto Stock { get; set; } = new();

    [JsonPropertyName("available")]
    public StatementsAvailabilityDto? Available { get; set; }

    [JsonPropertyName("links")]
    public Dictionary<string, string>? Links { get; set; }
}

public sealed class SectorDto
{
    [JsonPropertyName("sectorKey")]
    public string SectorKey { get; set; } = string.Empty;

    [JsonPropertyName("sectorName")]
    public string SectorName { get; set; } = string.Empty;

    [JsonPropertyName("marketCode")]
    public string? MarketCode { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public sealed class IndustryDto
{
    [JsonPropertyName("industryKey")]
    public string IndustryKey { get; set; } = string.Empty;

    [JsonPropertyName("industryName")]
    public string IndustryName { get; set; } = string.Empty;

    [JsonPropertyName("sectorKey")]
    public string? SectorKey { get; set; }

    [JsonPropertyName("marketCode")]
    public string? MarketCode { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public sealed class MetricDto
{
    [JsonPropertyName("metricKey")]
    public string MetricKey { get; set; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("valueType")]
    public string ValueType { get; set; } = "number";

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("statementType")]
    public string? StatementType { get; set; }

    [JsonPropertyName("periodSupport")]
    public string[]? PeriodSupport { get; set; }

    [JsonPropertyName("source")]
    public string? Source { get; set; }
}

public sealed class MetricDetailsDto
{
    [JsonPropertyName("metric")]
    public MetricDto Metric { get; set; } = new();

    [JsonPropertyName("aliases")]
    public string[]? Aliases { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

public sealed class StatementsAvailabilityDto
{
    [JsonPropertyName("marketCode")]
    public string MarketCode { get; set; } = string.Empty;

    [JsonPropertyName("ticker")]
    public string Ticker { get; set; } = string.Empty;

    [JsonPropertyName("standards")]
    public string[] Standards { get; set; } = Array.Empty<string>();

    [JsonPropertyName("periodsSupported")]
    public string[] PeriodsSupported { get; set; } = Array.Empty<string>();

    [JsonPropertyName("annualRange")]
    public YearRangeDto? AnnualRange { get; set; }

    [JsonPropertyName("quarterRange")]
    public QuarterRangeDto? QuarterRange { get; set; }

    [JsonPropertyName("metricsAvailable")]
    public object? MetricsAvailable { get; set; }

    [JsonPropertyName("lastUpdatedUtc")]
    public string? LastUpdatedUtc { get; set; }
}

public sealed class YearRangeDto
{
    [JsonPropertyName("fromYear")]
    public int FromYear { get; set; }

    [JsonPropertyName("toYear")]
    public int ToYear { get; set; }
}

public sealed class QuarterRangeDto
{
    [JsonPropertyName("from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("to")]
    public string To { get; set; } = string.Empty;
}

public sealed class MetricSeriesDto
{
    [JsonPropertyName("marketCode")]
    public string MarketCode { get; set; } = string.Empty;

    [JsonPropertyName("ticker")]
    public string Ticker { get; set; } = string.Empty;

    [JsonPropertyName("metricKey")]
    public string MetricKey { get; set; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("valueType")]
    public string ValueType { get; set; } = "number";

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("standard")]
    public string Standard { get; set; } = string.Empty;

    [JsonPropertyName("period")]
    public string Period { get; set; } = string.Empty;

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "raw";

    [JsonPropertyName("points")]
    public IReadOnlyList<MetricPointDto> Points { get; set; } = Array.Empty<MetricPointDto>();

    [JsonPropertyName("meta")]
    public ApiMetaDto Meta { get; set; } = new();
}

public sealed class MetricPointDto
{
    [JsonPropertyName("x")]
    public string X { get; set; } = string.Empty;

    [JsonPropertyName("valueNum")]
    public decimal? ValueNum { get; set; }

    [JsonPropertyName("valueRaw")]
    public string? ValueRaw { get; set; }
}

public sealed class BatchSeriesRequestDto
{
    [JsonPropertyName("items")]
    public List<BatchSeriesItemDto> Items { get; set; } = new();
}

public sealed class BatchSeriesItemDto
{
    [JsonPropertyName("marketCode")]
    public string MarketCode { get; set; } = string.Empty;

    [JsonPropertyName("ticker")]
    public string Ticker { get; set; } = string.Empty;

    [JsonPropertyName("metricKey")]
    public string MetricKey { get; set; } = string.Empty;

    [JsonPropertyName("period")]
    public string? Period { get; set; }

    [JsonPropertyName("standard")]
    public string? Standard { get; set; }

    [JsonPropertyName("mode")]
    public string? Mode { get; set; }

    [JsonPropertyName("limit")]
    public int? Limit { get; set; }
}

public sealed class BatchSeriesResponseDto
{
    [JsonPropertyName("results")]
    public IReadOnlyList<MetricSeriesDto> Results { get; set; } = Array.Empty<MetricSeriesDto>();

    [JsonPropertyName("errors")]
    public IReadOnlyList<BatchSeriesErrorDto> Errors { get; set; } = Array.Empty<BatchSeriesErrorDto>();

    [JsonPropertyName("meta")]
    public ApiMetaDto Meta { get; set; } = new();
}

public sealed class BatchSeriesErrorDto
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

