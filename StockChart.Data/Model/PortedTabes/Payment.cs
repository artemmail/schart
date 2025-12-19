using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;
[Table("Payment")]
public partial class Payment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    [ForeignKey("AspNetUser")]
    public Guid UserId { get; set; }
    public decimal PayAmount { get; set; }
    public DateTime PayDate { get; set; }
    public DateTime ExpireDate { get; set; }
    public int Service { get; set; }
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; }  
}
public class PaymentShow: Payment
{
    public string UserName { get; set; }
    public string Email { get; set; }
}