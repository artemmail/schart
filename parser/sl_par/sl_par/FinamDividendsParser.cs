using System;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using HtmlAgilityPack;

/// <summary>
/// Parser for Finam dividends HTML pages.
/// </summary>
public class FinamDividendsParser
{
    private static readonly string[] DateFormats = { "dd.MM.yyyy", "d.MM.yyyy", "dd.MM.yy", "d.MM.yy" };

    public bool TryParseFile(string filePath, out FinamDividendsPage page, out string error)
    {
        var ticker = Path.GetFileNameWithoutExtension(filePath);
        var html = File.ReadAllText(filePath);
        return TryParseHtml(html, ticker, out page, out error);
    }

    public bool TryParseHtml(string html, string ticker, out FinamDividendsPage page, out string error)
    {
        page = new FinamDividendsPage { Ticker = ticker };
        error = string.Empty;

        var document = new HtmlDocument();
        document.LoadHtml(html);

        var titleNode = document.DocumentNode.SelectSingleNode("//div[@id='title']//h1[@id='titleText']");
        if (titleNode == null)
        {
            error = "Заголовок не найден.";
            return false;
        }

        var descriptionNode = document.DocumentNode.SelectSingleNode("//div[@id='title']//div[contains(@class,'pt05x') and contains(@class,'mb1x')]");

        page.Title = CleanText(titleNode.InnerText);
        page.Description = CleanText(descriptionNode?.InnerText ?? string.Empty);

        var tableNode = document.DocumentNode.SelectSingleNode("//table[contains(@class,'finfin-local-plugin-quote-item-dividends-table')]");
        if (tableNode == null)
        {
            return true;
        }

        var rowNodes = tableNode.SelectNodes(".//tbody/tr");
        if (rowNodes == null)
        {
            return true;
        }

        foreach (var row in rowNodes)
        {
            var cells = row.SelectNodes("./td");
            if (cells == null || cells.Count < 4)
            {
                continue;
            }

            var buyBefore = ConvertToIsoDate(CleanText(cells[0].InnerText));
            var recordDate = ConvertToIsoDate(CleanText(cells[1].InnerText));
            var dividend = ConvertToDecimal(CleanText(cells[2].InnerText));
            var yieldText = CleanText(cells[3].InnerText);

            page.Dividends.Add(new FinamDividendEntry
            {
                BuyBefore = buyBefore,
                RecordDate = recordDate,
                Dividend = dividend,
                Yield = yieldText
            });
        }

        return true;
    }

    private static string CleanText(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        var decoded = WebUtility.HtmlDecode(input);
        decoded = decoded.Replace("\u00A0", " ");
        decoded = Regex.Replace(decoded, "\\s+", " ");
        return decoded.Trim();
    }

    private static string ConvertToIsoDate(string date)
    {
        if (string.IsNullOrWhiteSpace(date))
        {
            return string.Empty;
        }

        if (DateTime.TryParseExact(date, DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            return parsedDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        if (DateTime.TryParse(date, CultureInfo.InvariantCulture, DateTimeStyles.None, out parsedDate))
        {
            return parsedDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        return date;
    }

    private static decimal ConvertToDecimal(string dividend)
    {
        if (string.IsNullOrWhiteSpace(dividend))
        {
            return 0m;
        }

        var cleaned = Regex.Replace(dividend, @"[^0-9,\.\-]", string.Empty);
        cleaned = cleaned.Replace(",", ".");

        if (decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsedDividend))
        {
            return parsedDividend;
        }

        return 0m;
    }
}
