using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockChart.Model;

[Table("FootprintFavorites")]
public class FootprintFavorite
{
    [Key]
    public Guid Id { get; set; }

    [ForeignKey("AspNetUser")]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string ParamsJson { get; set; } = string.Empty;

    public int? PresetIndex { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ApplicationUser User { get; set; }
}
