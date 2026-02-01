namespace StockChart.UpdateService;

public sealed class UpdateServiceScheduleOptions
{
    public TimeSpan DividendsMoexInterval { get; set; } = TimeSpan.FromHours(1);
    public TimeSpan MoexSyncInterval { get; set; } = TimeSpan.FromHours(12);
    public TimeSpan YooMoneyInterval { get; set; } = TimeSpan.FromMinutes(1);
    public TimeSpan LotSizeFileInterval { get; set; } = TimeSpan.FromMinutes(1);
    public string NightlyBatchImportCron { get; set; } = "0 0 2 ? * TUE-SAT";
}
