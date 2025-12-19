using System.ComponentModel.DataAnnotations;

namespace StockChart.Model;
public partial class Dictionary
{
    public int Id { get; set; }
    public string Securityid { get; set; } = null!;
    public string Shortname { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public byte? Market { get; set; }
    public short? Oldid { get; set; }
    public string? ClassName { get; set; }
    public decimal Minstep { get; set; }
    public decimal Volperqnt { get; set; }
    public int? ClassId { get; set; }
    public int? CategoryTypeId { get; set; }
    [Range(typeof(decimal), "0.00000000", "99999999.99999999", ErrorMessage = "Value must be between 0 and 99999999.99999999")]
    public int? Lotsize { get; set; }
    public string? Currency { get; set; }
    public int? Scale { get; set; }
    public string? Isin { get; set; }
    public string? Fullname { get; set; }
    public virtual CategoryType? CategoryType { get; set; }
    public virtual Class? Class { get; set; }
    public virtual Market? MarketNavigation { get; set; }
}
