using DataProvider.Models;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace DataProvider.Services;

public sealed class QuikImportParseResult
{
    public List<QuikImportTrade> Trades { get; } = [];

    public int Rejected { get; set; }
}

public static class QuikImportTextParser
{
    public static IReadOnlyList<string> ParseTickers(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
            return [];

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new List<string>();

        foreach (var rawLine in payload.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries))
        {
            var ticker = TickerKey.Normalize(rawLine);
            if (string.IsNullOrEmpty(ticker))
                continue;

            if (seen.Add(ticker))
                result.Add(ticker);
        }

        return result;
    }

    public static QuikImportParseResult ParseTrades(string? payload, int maxTrades)
    {
        var result = new QuikImportParseResult();
        if (string.IsNullOrWhiteSpace(payload) || maxTrades <= 0)
            return result;

        foreach (var rawLine in payload.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries))
        {
            if (result.Trades.Count >= maxTrades)
                break;

            var line = rawLine.Trim();
            if (line.Length == 0)
                continue;

            // ticker|class|tradeNumber|tradeTimeMs|price|quantity|direction|flags[|openInterest]
            var parts = line.Split('|');
            if (parts.Length < 8)
            {
                result.Rejected++;
                continue;
            }

            var ticker = TickerKey.Normalize(parts[0]);
            if (string.IsNullOrEmpty(ticker))
            {
                result.Rejected++;
                continue;
            }

            if (!long.TryParse(parts[2], NumberStyles.Integer, CultureInfo.InvariantCulture, out var tradeNumber) || tradeNumber <= 0)
            {
                result.Rejected++;
                continue;
            }

            if (!long.TryParse(parts[3], NumberStyles.Integer, CultureInfo.InvariantCulture, out var tradeTimeMs) || tradeTimeMs <= 0)
            {
                result.Rejected++;
                continue;
            }

            if (!decimal.TryParse(parts[4], NumberStyles.Any, CultureInfo.InvariantCulture, out var price) || price <= 0)
            {
                result.Rejected++;
                continue;
            }

            if (!decimal.TryParse(parts[5], NumberStyles.Any, CultureInfo.InvariantCulture, out var quantity) || quantity <= 0)
            {
                result.Rejected++;
                continue;
            }

            if (!int.TryParse(parts[6], NumberStyles.Integer, CultureInfo.InvariantCulture, out var direction))
                direction = 0;

            if (!int.TryParse(parts[7], NumberStyles.Integer, CultureInfo.InvariantCulture, out var flags))
                flags = 0;

            var openInterest = 0;
            if (parts.Length > 8)
            {
                if (long.TryParse(parts[8], NumberStyles.Integer, CultureInfo.InvariantCulture, out var oiRaw))
                {
                    if (oiRaw > int.MaxValue)
                        openInterest = int.MaxValue;
                    else if (oiRaw < 0)
                        openInterest = 0;
                    else
                        openInterest = (int)oiRaw;
                }
            }

            if (direction != 0 && direction != 1)
                direction = (flags & 1) == 1 ? 1 : 0;

            result.Trades.Add(new QuikImportTrade
            {
                Ticker = ticker,
                ClassCode = parts[1].Trim(),
                TradeNumber = tradeNumber,
                TradeTimeMs = tradeTimeMs,
                Price = price,
                Quantity = quantity,
                OpenInterest = openInterest,
                Direction = direction,
                Flags = flags
            });
        }

        var acceptedKeys = new HashSet<string>(result.Trades.Count, StringComparer.OrdinalIgnoreCase);
        var deduped = result.Trades
            .Where(x => acceptedKeys.Add($"{x.Ticker}|{x.TradeNumber}"))
            .ToList();

        result.Rejected += result.Trades.Count - deduped.Count;
        result.Trades.Clear();
        result.Trades.AddRange(deduped);

        return result;
    }
}
