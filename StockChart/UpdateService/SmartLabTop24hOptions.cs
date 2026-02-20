namespace StockChart.UpdateService;

public sealed class SmartLabTop24hOptions
{
    public string TopUrl { get; set; } = "https://smart-lab.ru/top/";
    public string BaseUrl { get; set; } = "https://smart-lab.ru/";
    public string TopSectionTitle { get; set; } = "полезные записи за 24 часа";
    public string StockChartBaseUrl { get; set; } = "https://stockchart.ru";
    public string SystemUserName { get; set; } = "ruticker";
    public int MaxTopicsPerRun { get; set; } = 10;
}
