namespace StockChart.Model
{
    public class ShareholderDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal SharePercentage { get; set; }
    }

    public class ShareholdersStructureDto
    {
        public string Title { get; set; } = string.Empty;
        public DateTime? LastUpdateDate { get; set; }
        public List<ShareholderDto> Shareholders { get; set; } = new();
    }
}
