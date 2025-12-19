using System;

namespace StockChart.EventBus.Models
{


    public class ClusterColumnBase
    {
        public DateTime x { get; set; }
        public decimal o { get; set; }
        public decimal c { get; set; }
        public decimal l { get; set; }
        public decimal h { get; set; }
        public decimal q { get; set; }
        public decimal bq { get; set; }
        public decimal v { get; set; }
        public decimal bv { get; set; }
        public int oi { get; set; }
    };

}
