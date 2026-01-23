using Newtonsoft.Json;

/// <summary>
/// Single metric value from a financial table.
/// </summary>
public class FinancialMetricValue
{
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("year")]
    public string Year { get; set; } = string.Empty;

    [JsonProperty("value")]
    public string Value { get; set; } = string.Empty;
}
