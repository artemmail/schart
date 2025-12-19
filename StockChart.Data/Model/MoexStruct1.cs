using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class MoexStruct1
{
    public short DictionaryId { get; set; }
    public string Owner { get; set; } = null!;
    public double Percent { get; set; }
    //public virtual oldDiconary Dictionary { get; set; } = null!;
}
