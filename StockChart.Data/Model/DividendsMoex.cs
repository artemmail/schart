namespace StockChart.Model;

public partial class DividendsMoex
{
    public int Id { get; set; }
    public DateTime Datetime { get; set; }
    public decimal Value { get; set; }
    public int DictionaryId { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
