using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Market
{
    public byte Id { get; set; }
    public string Name { get; set; } = null!;
    public bool Visible { get; set; }
    public bool Structed { get; set; }
    public virtual ICollection<Dictionary> Dictionaries { get; } = new List<Dictionary>();
}
