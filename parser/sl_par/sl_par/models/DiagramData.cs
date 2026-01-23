using Newtonsoft.Json;

/// <summary>
/// Container for diagram data (main and change).
/// </summary>
public class DiagramData
{
    [JsonProperty("diagram")]
    public Diagram Diagram { get; set; } = new();

    [JsonProperty("change_diagram")]
    public Diagram ChangeDiagram { get; set; } = new();
}
