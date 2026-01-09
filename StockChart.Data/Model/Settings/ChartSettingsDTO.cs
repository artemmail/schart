
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
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

    [JsonConverter(typeof(VolumeHeightMapConverter))]
    public Dictionary<string, int>? VolumesHeight { get; set; }
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
        var normalizedVolumes = VolumeHeightDefaults.Normalize(VolumesHeight, CandlesOnly);
        chartSettings.VolumesHeight = SerializeVolumesHeight(normalizedVolumes);
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
        VolumesHeight = DeserializeVolumesHeight(chartSettings.VolumesHeight, chartSettings.CandlesOnly);
        DialogPositions = DeserializeDialogPositions(chartSettings.DialogPositions);
    }

    private static string? SerializeVolumesHeight(Dictionary<string, int>? volumesHeight)
    {
        if (volumesHeight == null || volumesHeight.Count == 0)
        {
            return null;
        }

        return JsonConvert.SerializeObject(volumesHeight);
    }

    private static Dictionary<string, int> DeserializeVolumesHeight(string? json, bool candlesOnly)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return VolumeHeightDefaults.Normalize(null, candlesOnly);
        }

        try
        {
            var parsed = JsonConvert.DeserializeObject<Dictionary<string, int>>(json);
            return VolumeHeightDefaults.Normalize(parsed, candlesOnly);
        }
        catch (JsonException)
        {
            return VolumeHeightDefaults.Normalize(null, candlesOnly);
        }
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

public static class VolumeHeightDefaults
{
    public const string SeparateVolume = "SeparateVolume";
    public const string OI = "OI";
    public const string Delta = "Delta";
    public const string OIDelta = "OIDelta";
    public const string Total = "Total";
    public const string DeltaBars = "DeltaBars";

    public static readonly string[] OrderedKeys =
    {
        SeparateVolume,
        OI,
        Delta,
        OIDelta,
        Total,
        DeltaBars,
    };

    private static readonly IReadOnlyDictionary<string, int> DefaultHeights =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            [SeparateVolume] = 50,
            [OI] = 50,
            [Delta] = 50,
            [OIDelta] = 50,
            [Total] = 120,
            [DeltaBars] = 50,
        };

    private static readonly IReadOnlyDictionary<string, int> MiniHeights =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            [SeparateVolume] = 95,
            [OI] = 110,
            [Delta] = 132,
            [OIDelta] = 75,
            [Total] = 120,
            [DeltaBars] = 123,
        };

    public static Dictionary<string, int> Normalize(
        IDictionary<string, int>? values,
        bool candlesOnly)
    {
        var defaults = candlesOnly ? MiniHeights : DefaultHeights;
        var result = new Dictionary<string, int>(defaults, StringComparer.OrdinalIgnoreCase);

        if (values == null)
        {
            return result;
        }

        foreach (var kvp in values)
        {
            if (result.ContainsKey(kvp.Key))
            {
                result[kvp.Key] = kvp.Value;
            }
        }

        return result;
    }

    public static Dictionary<string, int>? FromLegacyArray(int[]? values)
    {
        if (values == null || values.Length == 0)
        {
            return null;
        }

        var result = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var count = Math.Min(values.Length, OrderedKeys.Length);
        for (var i = 0; i < count; i++)
        {
            result[OrderedKeys[i]] = values[i];
        }

        return result;
    }
}

public sealed class VolumeHeightMapConverter : JsonConverter<Dictionary<string, int>?>
{
    public override Dictionary<string, int>? ReadJson(
        JsonReader reader,
        Type objectType,
        Dictionary<string, int>? existingValue,
        bool hasExistingValue,
        JsonSerializer serializer)
    {
        if (reader.TokenType == JsonToken.Null)
        {
            return null;
        }

        var token = JToken.Load(reader);
        if (token.Type == JTokenType.Array)
        {
            var values = token.ToObject<int[]>();
            return VolumeHeightDefaults.FromLegacyArray(values);
        }

        if (token.Type == JTokenType.Object)
        {
            return token.ToObject<Dictionary<string, int>>();
        }

        return null;
    }

    public override void WriteJson(
        JsonWriter writer,
        Dictionary<string, int>? value,
        JsonSerializer serializer)
    {
        if (value == null)
        {
            writer.WriteNull();
            return;
        }

        var output = new int[VolumeHeightDefaults.OrderedKeys.Length];
        for (var i = 0; i < VolumeHeightDefaults.OrderedKeys.Length; i++)
        {
            var key = VolumeHeightDefaults.OrderedKeys[i];
            if (value.TryGetValue(key, out var height))
            {
                output[i] = height;
            }
        }

        serializer.Serialize(writer, output);
    }
}
