using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockChart.Model;

[Table("McpConversations")]
public class McpConversation
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(512)]
    public string? LastMessagePreview { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAt { get; set; }

    public virtual ApplicationUser? User { get; set; }
    public virtual ICollection<McpConversationMessage> Messages { get; set; } = new List<McpConversationMessage>();
}
