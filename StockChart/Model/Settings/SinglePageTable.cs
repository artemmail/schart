
using StockChart.Model;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("SinglePageTable")]
public partial class SinglePageTable
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    [ForeignKey("AspNetUser")]
    public Guid? UserId { get; set; }
    public bool SinglePage { get; set; } = false;
    public virtual ApplicationUser User { get; set; }


}

