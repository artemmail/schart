using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Cluster
{
    public int Id { get; set; }
    public DateTime Period { get; set; }
    public decimal Price { get; set; }
    public decimal Quantity { get; set; }
    public decimal Buyquantity { get; set; }
    public int Count { get; set; }
    public decimal Maxtrade { get; set; }
    public virtual Dictionary IdNavigation { get; set; } = null!;
}
