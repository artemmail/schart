using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Lot
{
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? ShortName { get; set; }
    public string? ClassCode { get; set; }
    public string? ClassName { get; set; }
    public string? FaceValue { get; set; }
    public string? FaceUnit { get; set; }
    public decimal? Scale { get; set; }
    public string? MatDate { get; set; }
    public string? IsinCode { get; set; }
    public decimal? LotSize { get; set; }
    public string? MinPriceStep { get; set; }
}
