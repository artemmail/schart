using System.Collections.Generic;

/// <summary>
/// Supported application modes.
/// </summary>
public enum AppMode
{
    Financial,
    Diagrams,
    Shareholders,
    Logos,
    Finam
}

/// <summary>
/// Supported logo download formats.
/// </summary>
public enum LogoFormat
{
    Webp,
    Svg
}

/// <summary>
/// Parsed CLI options for the console app.
/// </summary>
public class CliOptions
{
    public AppMode Mode { get; set; }
    public List<string> Tickers { get; } = new();
    public List<string> ReportTypes { get; } = new();
    public List<string> Periods { get; } = new();
    public List<string> Indicators { get; } = new();

    public int SleepMs { get; set; } = 2000;
    public string OutputRoot { get; set; } = "c:/zip";
    public string LogosOutputDir { get; set; } = "C:/log";
    public LogoFormat LogoFormat { get; set; } = LogoFormat.Webp;

    public string DictionaryRoot { get; set; } = @"C:\stock\8.0\Angular\mat\src\assets\shares";
    public string DictionaryPeriod { get; set; } = "y";

    public string FinamInputDir { get; set; } = @"C:\log\financial";
    public string FinamOutputDir { get; set; } = @"C:\log\fin";
    public string FinamLegendPath { get; set; } = @"C:\log\legend.json";
    public int FinamTableIndex { get; set; }
}

/// <summary>
/// Result of parsing CLI arguments.
/// </summary>
public class CliParseResult
{
    public CliOptions? Options { get; set; }
    public bool ShowHelp { get; set; }
    public string? Error { get; set; }
}
