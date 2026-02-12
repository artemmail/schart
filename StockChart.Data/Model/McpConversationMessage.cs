using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockChart.Model;

[Table("McpConversationMessages")]
public class McpConversationMessage
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required]
    public Guid ConversationId { get; set; }

    [Required]
    [MaxLength(32)]
    public string Role { get; set; } = "assistant";

    [Required]
    public string Content { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? Provider { get; set; }

    [MaxLength(128)]
    public string? Model { get; set; }

    public bool IsError { get; set; }

    public string? DataJson { get; set; }
    public string? SuggestionsJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual McpConversation? Conversation { get; set; }
}
