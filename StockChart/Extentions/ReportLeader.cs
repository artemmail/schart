namespace StockChart.Model
{
    public class ReportLeader
    {
        public string ticker { get; set; }
        public string name { get; set; }
        public decimal opn { get; set; }
        public decimal cls { get; set; }
        public decimal percent { get; set; }
        public decimal volume { get; set; }
        public decimal bid { get; set; }
        public string color { get; set; }
    }
}