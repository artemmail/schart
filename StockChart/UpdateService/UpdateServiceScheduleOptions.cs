namespace StockChart.UpdateService;

public sealed class UpdateServiceScheduleOptions
{
    public string DividendsMoexInterval { get; set; } = "01:00:00";
    public string MoexSyncInterval { get; set; } = "12:00:00";
    public string YooMoneyInterval { get; set; } = "00:01:00";
    public string LotSizeFileInterval { get; set; } = "00:01:00";
    public string NightlyBatchImportCron { get; set; } = "0 0 2 ? * TUE-SAT";
}
