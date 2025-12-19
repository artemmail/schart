using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class MoexStruct
{
    public int DictionaryId { get; set; }
    public string Owner { get; set; } = null!;
    public double Percent { get; set; }
    public virtual Dictionary Dictionary { get; set; } = null!;
}
