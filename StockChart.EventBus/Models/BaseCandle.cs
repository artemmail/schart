using System;

namespace StockChart.EventBus.Models
{
    public partial class BaseCandle
    {
        public int Id { get; set; }

        public DateTime Period { get; set; }

        public decimal OpnPrice { get; set; }

        public decimal ClsPrice { get; set; }

        public decimal MinPrice { get; set; }

        public decimal MaxPrice { get; set; }

        public decimal Quantity { get; set; }

        public decimal Volume { get; set; }

        public decimal BuyQuantity { get; set; }

        public decimal BuyVolume { get; set; }

        public int Oi { get; set; }

    }
}
