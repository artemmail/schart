using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class CategoryType
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public byte? Market { get; set; }
    public virtual ICollection<Dictionary> Dictionaries { get; } = new List<Dictionary>();
}
