using System.Text.Json.Serialization;

namespace StockChart.Model;

public sealed class CandleSeriesResponseDto
{
    [JsonPropertyName("meta")]
    public ApiMetaDto Meta { get; set; } = new();

    [JsonPropertyName("ticker")]
    public string Ticker { get; set; } = string.Empty;

    [JsonPropertyName("period")]
    public decimal Period { get; set; }

    [JsonPropertyName("start")]
    public string Start { get; set; } = string.Empty;

    [JsonPropertyName("end")]
    public string End { get; set; } = string.Empty;

    [JsonPropertyName("fields")]
    public string[] Fields { get; set; } = Array.Empty<string>();

    [JsonPropertyName("data")]
    public object?[][] Data { get; set; } = Array.Empty<object?[]>();
}

