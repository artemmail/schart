using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Structure
{
    public string SecurityId { get; set; } = null!;
    public string Owner { get; set; } = null!;
    public double Percent { get; set; }
}
