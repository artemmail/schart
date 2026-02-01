namespace StockChart.UpdateService;

public sealed class LotSizeFileOptions
{
    public string FolderPath { get; set; } = @"C:\zip";
    public string FilePattern { get; set; } = "*lot_size.txt";
}
