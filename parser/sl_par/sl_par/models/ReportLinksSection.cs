using System.Collections.Generic;

public class ReportLinkEntry
{
    public string Label { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class ReportLinksSection
{
    public string Title { get; set; } = string.Empty;
    public List<ReportLinkEntry> Links { get; set; } = new();
}
