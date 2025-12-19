using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class GlobalDicExt
{
    public byte Market { get; set; }
    public short Id { get; set; }
    public string Securityid { get; set; } = null!;
    public string Shortname { get; set; } = null!;
    public decimal Minstep { get; set; }
    public decimal Volperqnt { get; set; }
    public byte Iscluster { get; set; }
    public byte Isfuture { get; set; }
}
