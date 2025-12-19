using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Category
{
    public short Id { get; set; }
    public string Securityid { get; set; } = null!;
    public string CategoryName { get; set; } = null!;
}
