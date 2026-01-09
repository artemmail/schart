
using Newtonsoft.Json;
using StockChart.Model;

public class ChartSettingsDTO
{
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
    public string Name { get; set; }

    public int[] VolumesHeight { get; set; }
    public Dictionary<string, DialogPositionDTO>? DialogPositions { get; set; }

    public ChartSettingsDTO()
    {

    }
    public ChartSettingsDTO(ChartSettings chartSettings)
    {
        CopyToSettingsDTO(chartSettings);
    }

    public void CopyFromSettingsDTO(ChartSettings chartSettings)
    {
        chartSettings.CandlesOnly = CandlesOnly;
        chartSettings.Head = Head;
        chartSettings.OI = OI;
        chartSettings.OIDelta = OIDelta;
        chartSettings.DeltaBars = DeltaBars;
        chartSettings.Delta = Delta;
        chartSettings.CompressToCandles = CompressToCandles;
        chartSettings.totalMode = totalMode;
        chartSettings.TopVolumes = TopVolumes;
        chartSettings.SeparateVolume = SeparateVolume;
        chartSettings.ShrinkY = ShrinkY;
        chartSettings.ToolTip = ToolTip;
        chartSettings.ExtendedToolTip = ExtendedToolTip;
        chartSettings.Postmarket = Postmarket;
        chartSettings.OpenClose = OpenClose;
        chartSettings.style = style;
        chartSettings.deltaStyle = deltaStyle;
        chartSettings.classic = classic;
        chartSettings.Contracts = Contracts;
        chartSettings.oiEnable = oiEnable;
        chartSettings.horizStyle = horizStyle;
        chartSettings.Bars = Bars;
        chartSettings.volume1 = volume1;
        chartSettings.volume2 = volume2;
        chartSettings.MaxTrades = MaxTrades;
        chartSettings.Name = Name;
        chartSettings.Default = Default;
        chartSettings.LastUpdate = DateTime.Now;
        chartSettings.LastSelection = DateTime.Now;
        chartSettings.VolumesHeight0 = VolumesHeight[0];
        chartSettings.VolumesHeight1 = VolumesHeight[1];
        chartSettings.VolumesHeight2 = VolumesHeight[2];
        chartSettings.VolumesHeight3 = VolumesHeight[3];
        chartSettings.VolumesHeight4 = VolumesHeight[4];
        chartSettings.VolumesHeight5 = VolumesHeight[5];
        chartSettings.DialogPositions = SerializeDialogPositions(DialogPositions);
    }

    public void CopyToSettingsDTO(ChartSettings chartSettings)
    {
        Name = chartSettings.Name;
        CandlesOnly = chartSettings.CandlesOnly;
        Head = chartSettings.Head;
        OI = chartSettings.OI;
        OIDelta = chartSettings.OIDelta;
        DeltaBars = chartSettings.DeltaBars;
        Delta = chartSettings.Delta;
        CompressToCandles = chartSettings.CompressToCandles;
        totalMode = chartSettings.totalMode;
        TopVolumes = chartSettings.TopVolumes;
        SeparateVolume = chartSettings.SeparateVolume;
        ShrinkY = chartSettings.ShrinkY;
        ToolTip = chartSettings.ToolTip;
        ExtendedToolTip = chartSettings.ExtendedToolTip;
        Postmarket = chartSettings.Postmarket;
        OpenClose = chartSettings.OpenClose;
        style = chartSettings.style;
        deltaStyle = chartSettings.deltaStyle;
        classic = chartSettings.classic;
        Contracts = chartSettings.Contracts;
        oiEnable = chartSettings.oiEnable;
        horizStyle = chartSettings.horizStyle;
        Bars = chartSettings.Bars;
        volume1 = chartSettings.volume1;
        volume2 = chartSettings.volume2;
        MaxTrades = chartSettings.MaxTrades;
        Default = chartSettings.Default;
        VolumesHeight = new int[] { chartSettings.VolumesHeight0, chartSettings.VolumesHeight1, chartSettings.VolumesHeight2, chartSettings.VolumesHeight3, chartSettings.VolumesHeight4, chartSettings.VolumesHeight5 };
        DialogPositions = DeserializeDialogPositions(chartSettings.DialogPositions);
    }

    private static string? SerializeDialogPositions(Dictionary<string, DialogPositionDTO>? positions)
    {
        if (positions == null || positions.Count == 0)
        {
            return null;
        }

        return JsonConvert.SerializeObject(positions);
    }

    private static Dictionary<string, DialogPositionDTO>? DeserializeDialogPositions(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonConvert.DeserializeObject<Dictionary<string, DialogPositionDTO>>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

public class DialogPositionDTO
{
    public int x { get; set; }
    public int y { get; set; }
}
