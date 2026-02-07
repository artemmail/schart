namespace StockChart.Model
{
    public sealed class MoexSyncSummary
    {
        public int UpdatedSecurityTypes { get; set; }
        public int UpdatedStocks { get; set; }
        public int UpdatedBonds { get; set; }
        public int UpdatedFutures { get; set; }
        public int UpdatedOptions { get; set; }
        public int LinksUpserted { get; set; }
    }
}
