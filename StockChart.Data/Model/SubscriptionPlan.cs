using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockChart.Model;

public class SubscriptionPlan
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(8)]
    public string Interval { get; set; } = "m";

    public int Count { get; set; }

    [Column(TypeName = "money")]
    public decimal OrdinalMoney { get; set; }

    [Column(TypeName = "money")]
    public decimal DiscountMoney { get; set; }

    public int Code { get; set; }

    public bool IsReferal { get; set; }

    [StringLength(8)]
    public string? ReferalInterval { get; set; }

    public int? ReferalCount { get; set; }
}
