namespace StockChart.Model
{
    public class Portfolio
    {
        public string ticker { get; set; }
        public string name { get; set; }
        public decimal? price { get; set; }
        public int? quantity { get; set; }
        public decimal? currprice { get; set; }
        public decimal? buycost { get; set; }
        public decimal? nowcost { get; set; }
        public decimal? profit { get; set; }
    }
}
