using Microsoft.EntityFrameworkCore;
using StockChart.EventBus.Models;
using System.ComponentModel.DataAnnotations.Schema;
namespace StockChart.Model;
[Keyless]
[Table("Candles")]
public partial class Candle : BaseCandle
{

    public virtual Dictionary IdNavigation { get; set; } = null!;
}
