using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockChart.Model;

[Table("FootprintLevelMarks")]
public class FootprintLevelMark
{
    [Key]
    public Guid Id { get; set; }

    [ForeignKey("AspNetUser")]
    public Guid UserId { get; set; }

    [ForeignKey("Dictionary")]
    public int TickerId { get; set; }

    [Column(TypeName = "decimal(18, 6)")]
    public decimal Price { get; set; }

    [Required]
    [MaxLength(32)]
    public string Color { get; set; } = "#F0E68C";

    [MaxLength(500)]
    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ApplicationUser User { get; set; }

    public virtual Dictionary Ticker { get; set; }
}
