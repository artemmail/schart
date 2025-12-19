using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using StockChart.Model;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;



public class TickerDIC
{
    public int market;
    public int id;
    public int lotsize;
}




public class MaxNumberForts
{
    public int id { get; set; }
    public long MaxNumber { get; set; }
}





public static class LastIdsContainer
{

    static Dictionary<int, long> LastIds = new Dictionary<int, long>();

    static Dictionary<KeyValuePair<int, int>, long> LastIdsEx = new Dictionary<KeyValuePair<int, int>, long>();
    public static long GetLastId(int id)
    {

        {
            if (!LastIds.ContainsKey(id))
            {
                using var context = SQLHelper.CreateContext();
                var res = context.MaxTrades
                    .AsNoTracking()
                    .Where(x => x.Id == id)
                    .OrderByDescending(x => x.MaxTime)
                    .Select(x => (long?)x.MaxNumber)
                    .FirstOrDefault();
                LastIds[id] = res ?? 0;
            }
            return LastIds[id];
        }
    }
    public static void UpdateLastId(int id, long number)
    {

        LastIds[id] = number;

    }
}
public static class SQLHelper
{
    public static ConcurrentDictionary<string, TickerDIC> TickerDic = new ConcurrentDictionary<string, TickerDIC>();
    private static readonly Lazy<IConfigurationRoot> Configuration = new(() =>
        new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build());

    public static StockProcContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext2>()
            .UseSqlServer(ConnectionString)
            .Options;

        return new StockProcContext(options);
    }
    public static void DIC()
    {
        using var dbContext = CreateContext();
        var tickers = dbContext.Dictionaries
            .AsNoTracking()
            .Select(x => new { x.Securityid, x.Market, x.Id, x.Lotsize })
            .Where(x => x.Securityid != null)
            .ToList();

        foreach (var ticker in tickers)
        {
            var key = ticker.Securityid.ToUpperInvariant();
            if (TickerDic.ContainsKey(key))
            {
                continue;
            }

            TickerDic[key] = new TickerDIC
            {
                market = ticker.Market ?? 0,
                id = ticker.Id,
                lotsize = ticker.Lotsize ?? 0
            };
        }

    }
    static SQLHelper()
    {
        DIC();
    }

    public static List<MissingIntervalWithTrades> GetMissingIntervalsWithTrades(int specificId, DateTime startPeriod, DateTime endPeriod)
    {
        using var dbContext = CreateContext();
        return dbContext.MissingIntervalsWithTrades
            .FromSqlInterpolated(
                $"EXEC sp_GetMissingTrades2 @SpecificID={specificId}, @StartPeriod={startPeriod}, @EndPeriod={endPeriod}")
            .ToList();
    }
    public static string ConnectionString
    {
        get
        {
            var configured = Configuration.Value.GetConnectionString(\"DefaultConnection\");
            if (!string.IsNullOrWhiteSpace(configured))
            {
                return configured;
            }

            return \"data source=localhost;initial catalog=stock;;TrustServerCertificate=True;integrated security=True;persist security info=True;connect timeout=20000;MultipleActiveResultSets=True;App=EntityFramework\";
        }
    }






    public static List<MissingIntervalWithTrades> SplitIntervalsByDay(List<MissingIntervalWithTrades> intervals)
    {
        var result = new List<MissingIntervalWithTrades>();

        foreach (var interval in intervals)
        {
            // Если интервал умещается в один день
            if (interval.MissingStart.Date == interval.MissingEnd.Date)
            {
                // Добавляем без изменений
                result.Add(interval);
                continue;
            }

            // Интервал пересекает границы нескольких дней
            DateTime currentStart = interval.MissingStart;
            DateTime finalEnd = interval.MissingEnd;

            // Первый интервал - от MissingStart до конца текущих суток
            DateTime firstIntervalEnd = currentStart.Date.AddDays(1);
            var firstPart = new MissingIntervalWithTrades
            {
                MissingStart = currentStart,
                MissingEnd = firstIntervalEnd,
                BeforeGapTradeNumber = interval.BeforeGapTradeNumber,
                BeforeGapTradeDate = interval.BeforeGapTradeDate,
                AfterGapTradeDate = firstIntervalEnd
            };
            result.Add(firstPart);

            // Обрабатываем промежуточные дни (если есть)
            DateTime nextStart = firstIntervalEnd;
            while (nextStart.AddDays(1) < finalEnd.Date)
            {
                // Целые сутки без номеров сделок
                var middlePart = new MissingIntervalWithTrades
                {
                    MissingStart = nextStart,
                    MissingEnd = nextStart.Date.AddDays(1)
                };
                result.Add(middlePart);
                nextStart = nextStart.Date.AddDays(1);
            }

            // Последний интервал - от начала последних суток до MissingEnd
            var lastPart = new MissingIntervalWithTrades
            {
                MissingStart = nextStart,
                MissingEnd = finalEnd,

                AfterGapTradeNumber = interval.AfterGapTradeNumber,
                BeforeGapTradeDate = nextStart,
                AfterGapTradeDate = interval.AfterGapTradeDate
            };
            result.Add(lastPart);
        }

        return result;
    }








    public static List<T> ConvertDataTable<T>(DataTable dt)
    {
        var columnNames = dt.Columns.Cast<DataColumn>().Select(c => c.ColumnName).ToList();
        var properties = typeof(T).GetProperties();
        var rows = dt.Rows;
        var alist = new List<T>();
        foreach (DataRow row in rows)
        {
            var obj = Activator.CreateInstance<T>();
            foreach (var pro in properties)
            {
                if (columnNames.Contains(pro.Name))
                {
                    try
                    {
                        pro.SetValue(obj,
                                     pro.PropertyType.IsEnum
                                         ? Enum.ToObject(pro.PropertyType, row[pro.Name])
                                         : row[pro.Name], null);
                    }
                    catch (Exception)
                    {
                    }
                }
            }
            alist.Add(obj);
        }
        return alist;
    }
}
