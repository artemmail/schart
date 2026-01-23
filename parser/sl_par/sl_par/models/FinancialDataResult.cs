using System.Collections.Generic;

/// <summary>
/// Parsed financial values and caption dictionary.
/// </summary>
public class FinancialDataResult
{
    public FinancialDataResult()
    {
        Values = new List<FinancialMetricValue>();
        Captions = new Dictionary<string, string>();
    }

    public FinancialDataResult(List<FinancialMetricValue> values, Dictionary<string, string> captions)
    {
        Values = values;
        Captions = captions;
    }

    public List<FinancialMetricValue> Values { get; set; }
    public Dictionary<string, string> Captions { get; set; }
}
