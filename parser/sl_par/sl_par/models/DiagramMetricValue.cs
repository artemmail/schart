using Newtonsoft.Json;

/// <summary>
/// Point produced from a Smart-Lab diagram.
/// </summary>
public class DiagramMetricValue
{
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("year")]
    public string Year { get; set; } = string.Empty;

    [JsonProperty("value")]
    public double? Value { get; set; }
}
