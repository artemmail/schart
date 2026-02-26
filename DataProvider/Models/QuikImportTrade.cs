using System.Collections.Generic;

namespace DataProvider.Models;

public sealed class QuikImportTrade
{
    public string Ticker { get; init; } = string.Empty;
    public string ClassCode { get; init; } = string.Empty;
    public long TradeNumber { get; init; }
    public long TradeTimeMs { get; init; }
    public decimal Price { get; init; }
    public decimal Quantity { get; init; }
    public int OpenInterest { get; init; }
    public int Direction { get; init; }
    public int Flags { get; init; }
}

public sealed class QuikImportBatch
{
    public QuikImportBatch(IReadOnlyList<QuikImportTrade> trades)
    {
        Trades = trades ?? [];
    }

    public IReadOnlyList<QuikImportTrade> Trades { get; }
}
