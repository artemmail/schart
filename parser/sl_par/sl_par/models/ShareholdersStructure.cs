using System;
using System.Collections.Generic;

/// <summary>
/// Shareholders structure block from Smart-Lab.
/// </summary>
public class ShareholdersStructure
{
    public string Title { get; set; } = string.Empty;
    public DateTime LastUpdateDate { get; set; }
    public List<Shareholder> Shareholders { get; set; } = new();
}
