using System;
using System.Collections.Generic;
namespace StockChart.Model;
public partial class Share
{
    public string? Secid { get; set; }
    public string? Name { get; set; }
    public string? Shortname { get; set; }
    public string? Isin { get; set; }
    public string? Regnumber { get; set; }
    public string? Issuesize { get; set; }
    public string? Facevalue { get; set; }
    public string? Faceunit { get; set; }
    public string? Issuedate { get; set; }
    public string? Latname { get; set; }
    public string? Type { get; set; }
    public string? Typename { get; set; }
}
