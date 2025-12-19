using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;


[Table("UserGameBallance")]
public partial class UserGameBallance
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    [ForeignKey("AspNetUser")]
    public Guid UserId { get; set; }
    public decimal Ballance { get; set; }
    public byte PortfolioNumber { get; set; }
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; }
}
