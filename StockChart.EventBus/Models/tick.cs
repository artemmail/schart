using System;

namespace StockChart.EventBus.Models
{
    public class tick
    {

        public long Number { get; set; }
        public DateTime TradeDate { get; set; }
        public decimal Price { get; set; }
        public decimal Quantity { get; set; }
        public Byte Direction { get; set; }
        public decimal Volume { get; set; }
        public int OI { get; set; }
    }
}
