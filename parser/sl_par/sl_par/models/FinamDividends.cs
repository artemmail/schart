using System.Collections.Generic;

/// <summary>
/// Single dividend entry parsed from Finam dividends table.
/// </summary>
public class FinamDividendEntry
{
    public string BuyBefore { get; set; } = string.Empty;
    public string RecordDate { get; set; } = string.Empty;
    public decimal Dividend { get; set; }
    public string Yield { get; set; } = string.Empty;
}

/// <summary>
/// Parsed dividends page for a ticker.
/// </summary>
public class FinamDividendsPage
{
    public string Ticker { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<FinamDividendEntry> Dividends { get; set; } = new();
}
