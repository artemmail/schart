using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

namespace StockChart.Data;

public static class TradeBatchExtensions
{
    public static async Task InsertTradesBatchAsync(this StockProcContext context, IEnumerable<Trade> trades)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(trades);

        var tradeList = trades.ToList();
        if (!tradeList.Any())
            return;

        var payload = tradeList.Select(trade => new
        {
            n = trade.Number,
            i = trade.Id,
            d = trade.TradeDate,
            p = trade.Price,
            q = trade.Quantity,
            v = trade.Volume,
            o = trade.Oi,
            b = trade.Direction
        }).ToList();

        var json = Newtonsoft.Json.JsonConvert.SerializeObject(payload);
        var jsonParameter = new SqlParameter("@jsonParam", SqlDbType.NVarChar)
        {
            Value = json
        };

        const string sql = @"
DECLARE @json NVARCHAR(MAX) = @jsonParam;
INSERT INTO trades (ID, number, TradeDate, Price, Quantity, Volume, OI, Direction)
SELECT i, n, d, p, q, v, o, b
FROM OPENJSON(@json, '$')
WITH(
    n bigint '$.n',
    i int '$.i',
    d datetime2 '$.d',
    p decimal(18, 6) '$.p',
    q decimal(18, 6) '$.q',
    v decimal(18, 6) '$.v',
    o int '$.o',
    b int '$.b'
);";

        await context.Database.ExecuteSqlRawAsync(sql, jsonParameter);
    }

    public static async Task InsertTradesBinanceBatchAsync(this StockProcContext context, IEnumerable<Tradesbinance> trades)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(trades);

        var tradeList = trades.ToList();
        if (!tradeList.Any())
            return;

        var payload = tradeList.Select(trade => new
        {
            n = trade.Number,
            i = trade.Id,
            d = trade.TradeDate,
            p = trade.Price,
            q = trade.Quantity,
            b = trade.Direction
        }).ToList();

        var json = Newtonsoft.Json.JsonConvert.SerializeObject(payload);
        var jsonParameter = new SqlParameter("@jsonParam", SqlDbType.NVarChar)
        {
            Value = json
        };

        const string sql = @"
DECLARE @json NVARCHAR(MAX) = @jsonParam;
INSERT INTO tradesbinance (ID, number, TradeDate, Price, Quantity, Direction)
SELECT i, n, d, p, q, b
FROM OPENJSON(@json, '$')
WITH(
    n bigint '$.n',
    i int '$.i',
    d datetime2 '$.d',
    p decimal(18, 6) '$.p',
    q decimal(18, 6) '$.q',
    b int '$.b'
);";

        await context.Database.ExecuteSqlRawAsync(sql, jsonParameter);
    }
}
