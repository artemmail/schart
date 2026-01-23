using System.Collections.Generic;

/// <summary>
/// Parsed row from a Finam financial HTML table.
/// </summary>
public class FinancialTableRow
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, string> DataChart { get; set; } = new();
}
