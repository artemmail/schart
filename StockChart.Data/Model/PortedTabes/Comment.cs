using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;
[Table("UserComment")]
public partial class Comment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public int TopicId { get; set; }
    public string Text { get; set; } = null!;
    public Guid UserId { get; set; }
    [ForeignKey("TopicId")]
    public virtual Topic Topic { get; set; } = null!;
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; } = null!;
}
