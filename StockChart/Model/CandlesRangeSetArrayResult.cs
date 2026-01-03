namespace StockChart.Model
{
    public class CandlesRangeSetValue
    {
        public decimal Min { get; set; }

        public decimal Max { get; set; }

        public decimal Opn { get; set; }

        public decimal Cls { get; set; }

        public decimal Vol { get; set; }

        public decimal Qnt { get; set; }

        public int Bid { get; set; }

        public int OpIn { get; set; }

        public long Date { get; set; }

        public decimal? Price1 { get; set; }

        public decimal? Price2 { get; set; }
    }
}
