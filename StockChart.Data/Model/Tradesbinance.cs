using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Tradesbinance
{
    public int Id { get; set; }
    public long Number { get; set; }
    public DateTime TradeDate { get; set; }
    public decimal Price { get; set; }
    public decimal Quantity { get; set; }
    public byte Direction { get; set; }
    public virtual Dictionary IdNavigation { get; set; } = null!;
}
