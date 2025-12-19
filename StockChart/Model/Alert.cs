using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Alert
{
    public int Id { get; set; }
    public Guid User { get; set; }
    public string Ticker { get; set; } = null!;
    public decimal Price { get; set; }
    public short Sign { get; set; }
    public DateTime Time { get; set; }
    public DateTime? Exectime { get; set; }
    
}
