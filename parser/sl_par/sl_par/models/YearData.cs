using Newtonsoft.Json;

/// <summary>
/// Diagram value with optional metadata.
/// </summary>
public class YearData
{
    [JsonProperty("y")]
    public double? Y { get; set; }

    [JsonProperty("color")]
    public string Color { get; set; } = string.Empty;

    [JsonProperty("comment")]
    public string Comment { get; set; } = string.Empty;
}
