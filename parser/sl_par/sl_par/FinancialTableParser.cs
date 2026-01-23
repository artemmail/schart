using System;
using System.Collections.Generic;
using System.Net;
using HtmlAgilityPack;
using Newtonsoft.Json;

/// <summary>
/// Parser for Finam financial tables stored as HTML files.
/// </summary>
public class FinancialTableParser
{
    /// <summary>
    /// Captures description text by metric title.
    /// </summary>
    public static Dictionary<string, string> Descriptions { get; } = new();

    /// <summary>
    /// Parses a financial table and returns row data.
    /// </summary>
    public List<FinancialTableRow> ParseFinancialTable(string filePath, int tableIndex = 0)
    {
        var document = new HtmlDocument();
        document.Load(filePath);

        var tables = document.DocumentNode.SelectNodes("//table[@class='table-generic finfin-local-plugin-quote-item-financial-table']");
        if (tables == null || tables.Count <= tableIndex)
        {
            throw new Exception("Финансовая таблица не найдена.");
        }

        var table = tables[tableIndex];
        var rows = table.SelectNodes(".//tbody/tr");
        var result = new List<FinancialTableRow>();

        if (rows == null)
        {
            return result;
        }

        foreach (var row in rows)
        {
            var titleCell = row.SelectSingleNode(".//td[contains(@class, 'finfin-local-plugin-quote-item-financial-row-title')]");
            if (titleCell == null)
            {
                continue;
            }

            var titleText = string.Empty;
            var descriptionText = string.Empty;

            var nameNode = titleCell.SelectSingleNode(".//div[@class='p05x']");
            if (nameNode != null)
            {
                var rawNameText = nameNode.InnerText.Trim();
                var cleanNameText = ExtractCleanText(rawNameText);
                var parts = cleanNameText.Replace("&nbsp;", "|").Split('|', 2);
                titleText = parts[0];
                if (parts.Length > 1)
                {
                    descriptionText = parts[1];
                }
            }

            var tooltipNode = titleCell.SelectSingleNode(".//span[@data-role='tooltip-content']");
            if (tooltipNode != null && string.IsNullOrWhiteSpace(descriptionText))
            {
                descriptionText = tooltipNode.InnerText.Trim();
            }

            var dataChartNode = titleCell.SelectSingleNode(".//div[@data-chart]");
            var dataChart = dataChartNode?.GetAttributeValue("data-chart", string.Empty);

            if (!string.IsNullOrWhiteSpace(dataChart) && !string.IsNullOrWhiteSpace(titleText))
            {
                Descriptions[titleText] = descriptionText;

                result.Add(new FinancialTableRow
                {
                    Title = titleText,
                    Description = descriptionText,
                    DataChart = ExtractDataChart(dataChart)
                });
            }
        }

        return result;
    }

    private static string ExtractCleanText(string input)
    {
        var endIndex = input.IndexOf('<');
        if (endIndex >= 0)
        {
            return input.Substring(0, endIndex).Trim();
        }

        return input;
    }

    private static Dictionary<string, string> ExtractDataChart(string dataChartJson)
    {
        var dataChart = new Dictionary<string, string>();
        var json = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(WebUtility.HtmlDecode(dataChartJson));

        if (json == null)
        {
            return dataChart;
        }

        foreach (var item in json)
        {
            if (item.TryGetValue("date", out var dateObject) && item.TryGetValue("value", out var valueObject))
            {
                var date = DateTime.Parse(dateObject?.ToString() ?? string.Empty).ToString("yyyy");
                var value = valueObject?.ToString() ?? string.Empty;
                dataChart[date] = value;
            }
        }

        return dataChart;
    }
}
