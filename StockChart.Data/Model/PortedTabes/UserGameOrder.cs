using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;
public partial class UserGameOrder
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
   
    public Guid UserId { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }    
    public DateTime OrderTime { get; set; }
    public byte PortfolioNumber { get; set; }
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; }
}
