using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public class FinancialReport
{
    public string Year { get; set; }
    public Dictionary<string, string> Metrics { get; set; }

    public FinancialReport()
    {
        Metrics = new Dictionary<string, string>();
    }
}

public class DataPoint
{
    public string name { get; set; }
    public string year { get; set; }
    public double value { get; set; }
}

public class YearData
{
    [JsonProperty("y")]
    public double? Y { get; set; }

    [JsonProperty("color")]
    public string Color { get; set; }

    [JsonProperty("comment")]
    public string Comment { get; set; }
}

public class Diagram
{
    [JsonProperty("categories")]
    public List<string> Categories { get; set; }

    [JsonProperty("data")]
    public List<YearData> Data { get; set; }

    [JsonProperty("field")]
    public string Field { get; set; }

    [JsonProperty("point_format")]
    public string PointFormat { get; set; }
}



public class DiagramData
{
    [JsonProperty("diagram")]
    public Diagram Diagram { get; set; }

    [JsonProperty("change_diagram")]
    public Diagram ChangeDiagram { get; set; }
}



public class ShareholdersStructure
{
    public string Title { get; set; }
    public DateTime LastUpdateDate { get; set; }
    public List<Shareholder> Shareholders { get; set; }

    public ShareholdersStructure()
    {
        Shareholders = new List<Shareholder>();
    }
}

public class Shareholder
{
    public string Name { get; set; }
    public double SharePercentage { get; set; }
}

public class DiagramDataResult
{
    public DiagramData YearData { get; set; }
    public DiagramData QuarterData { get; set; }
}