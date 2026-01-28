using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace StockChart.Model;

[Table("FootprintFavoritesBoards")]
public class FootprintFavoritesBoard
{
    [Key]
    [ForeignKey("AspNetUser")]
    public Guid UserId { get; set; }

    [Required]
    public string ConfigJson { get; set; } = "{}";

    public DateTime UpdatedAt { get; set; }

    public virtual ApplicationUser User { get; set; }
}
