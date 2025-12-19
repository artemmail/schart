using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;


[Table("UserGameShare")]
public partial class UserGameShare
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    [ForeignKey("AspNetUser")]
    public Guid UserId { get; set; }
    [Column(TypeName = "decimal(18, 8)")]
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    [ForeignKey("Dictionary")]
    public int DictionaryId { get; set; }
    public byte PortfolioNumber { get; set; }
    public virtual Dictionary Dictionary { get; set; }
    [ForeignKey("UserId")]
    public virtual ApplicationUser User { get; set; }
}
