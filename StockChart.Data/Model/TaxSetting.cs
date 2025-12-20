using System.ComponentModel.DataAnnotations;

namespace StockChart.Model;

public class TaxSetting
{
    [Key]
    public int Id { get; set; }

    public DateTime DiscountBefore { get; set; }
}
