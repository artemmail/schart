/// <summary>
/// Year and quarter diagram payloads.
/// </summary>
public class DiagramDataResult
{
    public DiagramData YearData { get; set; } = new();
    public DiagramData QuarterData { get; set; } = new();
}
