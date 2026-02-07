using System;

namespace DataProvider.Services
{
    internal static class TickerKey
    {
        internal static string Normalize(string? ticker)
        {
            if (string.IsNullOrWhiteSpace(ticker))
                return string.Empty;

            return ticker.Trim().ToUpperInvariant();
        }
    }
}
