using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;
public partial class PushDevice
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    [ForeignKey("AspNetUser")]
    public Guid UserId { get; set; }
    public string DeviceId { get; set; } = null!;
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; }
}
