using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;
[Table("Bill")]
public partial class Bill
{
    [Key]
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? ReferalId { get; set; }
    public DateTime Date { get; set; }
    public decimal Amount { get; set; }
    [StringLength(16)]
    public string Interval { get; set; }
    public int Count { get; set; }
    public int Services { get; set; }
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; }
    public bool IsApplied { get; set; }
    //[ForeignKey("ReferalId")]
    //public virtual ApplicationUser Referal { get; set; }
}
