using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;


[Table("ChartSettings")]
public partial class ChartSettings
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    [ForeignKey("AspNetUser")]
    public Guid? UserId { get; set; }
    public string Name { get; set; }
    public bool Selected { get; set; } = false;


    public bool ShowVolume { get; set; }
    public bool CandlesOnly { get; set; }
    public bool Head { get; set; }
    public bool OI { get; set; }
    public bool OIDelta { get; set; }
    public bool Delta { get; set; }

    public bool DeltaBars { get; set; }
    public string CompressToCandles { get; set; }
    public string totalMode { get; set; }
    public bool TopVolumes { get; set; }
    public bool SeparateVolume { get; set; }
    public bool ShrinkY { get; set; }
    public bool ToolTip { get; set; }
    public bool ExtendedToolTip { get; set; }
    public bool Postmarket { get; set; }
    public bool OpenClose { get; set; }
    public string style { get; set; }
    public string deltaStyle { get; set; }
    public string classic { get; set; }
    public bool Contracts { get; set; }
    public bool oiEnable { get; set; }
    public bool horizStyle { get; set; }
    public bool Bars { get; set; }
    public int volume1 { get; set; }
    public int volume2 { get; set; }
    public bool MaxTrades { get; set; }

    public bool Default { get; set; }
    public DateTime LastUpdate { get; set; }
    public DateTime LastSelection { get; set; }

    public int VolumesHeight0 { get; set; }
    public int VolumesHeight1 { get; set; }
    public int VolumesHeight2 { get; set; }
    public int VolumesHeight3 { get; set; }
    public int VolumesHeight4 { get; set; }
    public int VolumesHeight5 { get; set; }




    public virtual ApplicationUser User { get; set; }


}

