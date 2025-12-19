using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;
[Table("Topic")]
public partial class Topic
{
    
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    
    public Guid UserId { get; set; }
    public DateTime Date { get; set; }   
    public string Header { get; set; } = null!;
    public string Text { get; set; } = null!;
    public string Slug { get; set; } = null!;

    public virtual ICollection<Comment> UserComments { get; set; } = new List<Comment>();
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; } = null!;
}
