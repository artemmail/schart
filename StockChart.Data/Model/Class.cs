using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Class
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public byte MarketId { get; set; }
    public virtual ICollection<Dictionary> Dictionaries { get; } = new List<Dictionary>();
}
