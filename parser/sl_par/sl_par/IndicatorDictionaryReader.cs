using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;

/// <summary>
/// Reads indicator dictionary keys from a local dic.json file.
/// </summary>
public static class IndicatorDictionaryReader
{
    public static IReadOnlyList<string> ReadKeys(string dictionaryRoot, string ticker, string reportType, string period)
    {
        var path = BuildPath(dictionaryRoot, ticker, reportType, period);

        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Файл не найден по пути: {path}");
        }

        var jsonString = File.ReadAllText(path);
        var jsonData = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonString);

        if (jsonData == null)
        {
            throw new Exception("Не удалось десериализовать JSON-файл.");
        }

        return new List<string>(jsonData.Keys);
    }

    public static string BuildPath(string dictionaryRoot, string ticker, string reportType, string period)
    {
        return Path.Combine(dictionaryRoot, ticker, reportType, period, "dic.json");
    }
}
