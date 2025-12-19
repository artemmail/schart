using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class TradesEx
{
    public int Id { get; set; }
    public long Number { get; set; }
    public DateTime RoundDate { get; set; }
    public DateTime TradeDate { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public decimal Volume { get; set; }
    public int Oi { get; set; }
    public byte Direction { get; set; }
}
