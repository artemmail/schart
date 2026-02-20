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
    public bool Hide { get; set; } = false;

    public virtual ICollection<Comment> UserComments { get; set; } = new List<Comment>();
    public virtual ICollection<TopicLike> TopicLikes { get; set; } = new List<TopicLike>();
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; } = null!;
}
