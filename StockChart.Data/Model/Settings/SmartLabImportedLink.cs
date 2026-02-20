using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockChart.Model;

[Table("SmartLabImportedLinks")]
public class SmartLabImportedLink
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(1024)]
    public string Url { get; set; } = string.Empty;

    [MaxLength(512)]
    public string? Header { get; set; }

    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;

    public int? TopicId { get; set; }
    public virtual Topic? Topic { get; set; }
}
