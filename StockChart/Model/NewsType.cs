using System;
using System.Collections.Generic;
using StockChart.Model;
namespace StockChart.Model;
public partial class NewsType
{
    public int Id { get; set; }
    public string Type { get; set; } = null!;
    public virtual ICollection<Topic> News { get; } = new List<Topic>();
}
