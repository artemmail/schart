using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class MaxTrade
{
    public int Id { get; set; }
    public long MaxNumber { get; set; }
    public DateTime MaxTime { get; set; }
}
