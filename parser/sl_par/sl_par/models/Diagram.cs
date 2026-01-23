using System.Collections.Generic;
using Newtonsoft.Json;

/// <summary>
/// Smart-Lab diagram payload.
/// </summary>
public class Diagram
{
    [JsonProperty("categories")]
    public List<string> Categories { get; set; } = new();

    [JsonProperty("data")]
    public List<YearData> Data { get; set; } = new();

    [JsonProperty("field")]
    public string Field { get; set; } = string.Empty;

    [JsonProperty("point_format")]
    public string PointFormat { get; set; } = string.Empty;
}
