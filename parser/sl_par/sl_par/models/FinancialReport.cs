using System.Collections.Generic;

/// <summary>
/// Legacy financial report snapshot keyed by metric name.
/// </summary>
public class FinancialReport
{
    public string Year { get; set; } = string.Empty;
    public Dictionary<string, string> Metrics { get; set; } = new Dictionary<string, string>();
}
