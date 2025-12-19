using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;




[Table("FileEntity")]
public class FileEntity
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public virtual ApplicationUser? User { get; set; }
    public string FileName { get; set; }
    public byte[] FileData { get; set; }

    public DateTime CreatedTime { get; set; }
    public DateTime OpenTime { get; set; }

    public int DownLoads { get; set; }
}