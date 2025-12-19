namespace StockChart.Repository
{
    public class CacheConfiguration
    {
        public int AbsoluteExpirationInHours { get; set; }
        public int SlidingExpirationInMinutes { get; set; }
    }

    public class SpaOptions
    {
        public string SpaRootPath { get; set; }
    }
}
