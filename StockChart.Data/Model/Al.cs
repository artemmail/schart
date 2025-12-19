using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Al
{
    public int Id { get; set; }
    public Guid User { get; set; }
    public string Ticker { get; set; } = null!;
    public decimal Price { get; set; }
    public short Sign { get; set; }
    public DateTime Time { get; set; }
    public DateTime? Exectime { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = null!;
    public string LoweredUserName { get; set; } = null!;
    public string? MobileAlias { get; set; }
    public bool IsAnonymous { get; set; }
    public DateTime LastActivityDate { get; set; }
}
