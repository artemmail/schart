using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using StockChart.Data;
using StockChart.Model;



public class TickerDIC
{
    public int market;
    public int id;
    public int lotsize;
}




public class DicView
{
    public string SECURITYID { get; set; }
    public byte market { get; set; }
    public int id { get; set; }


    public int lotsize { get; set; }



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
                var res = SQLHelper.ScalarFromQuery($"select top 1  maxnumber from [MaxTrades] where id = {id}");
                if (res == null)
                    LastIds[id] = 0;
                else
                    LastIds[id] = (long)res;
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
    public static void DIC()
    {
        using var context = DatabaseContextFactory.CreateStockProcContext(ConnectionString);
        var tickerList = context.Dictionaries
            .AsNoTracking()
            .Select(x => new
            {
                x.Securityid,
                x.Market,
                x.Id,
                x.Lotsize
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.Securityid))
            .ToList();

        foreach (var ticker in tickerList)
        {
            var mappedTicker = new TickerDIC
            {
                market = ticker.Market ?? 0,
                id = ticker.Id,
                lotsize = ticker.Lotsize ?? 0
            };

            TickerDic[ticker.Securityid!] = mappedTicker;
        }

    }
    static SQLHelper()
    {
        DIC();
    }

    public static List<MissingIntervalWithTrades> GetMissingIntervalsWithTrades(int specificId, DateTime startPeriod, DateTime endPeriod)
    {
        using var context = DatabaseContextFactory.CreateStockProcContext(ConnectionString);
        var parameters = new[]
        {
            new SqlParameter("@SpecificID", SqlDbType.Int) { Value = specificId },
            new SqlParameter("@StartPeriod", SqlDbType.DateTime) { Value = startPeriod },
            new SqlParameter("@EndPeriod", SqlDbType.DateTime) { Value = endPeriod }
        };

        return context.Database
            .SqlQueryRaw<MissingIntervalWithTrades>("EXEC sp_GetMissingTrades2 @SpecificID, @StartPeriod, @EndPeriod", parameters)
            .ToList();
    }
    public static string ConnectionString
    {
        get
        {
            return
            //    "Server = SLIM; Database = stock; Trusted_Connection = True; Connection Timeout = 200";
            // "Data Source=77.51.186.0;Initial Catalog=stock;User ID=ruticker;Password=121212;Connection Timeout=20000";
            //"Data Source=192.168.1.8;Initial Catalog=stock;User id=ruticker;Password=121212;Connection Timeout=40000;TrustServerCertificate=True;MultipleActiveResultSets=true;\r\n";
            "data source=localhost;initial catalog=stock;;TrustServerCertificate=True;integrated security=True;persist security info=True;connect timeout=20000;MultipleActiveResultSets=True;App=EntityFramework";
        }
    }
    public static DataTable DataTableFromQuery(string s)
    {
        using var context = DatabaseContextFactory.CreateStockProcContext(ConnectionString);
        using var command = context.Database.GetDbConnection().CreateCommand();
        command.CommandText = s;
        command.CommandType = CommandType.Text;

        context.Database.OpenConnection();
        try
        {
            using var reader = command.ExecuteReader();
            DataTable dt = new DataTable();
            dt.Load(reader);
            return dt;
        }
        finally
        {
            context.Database.CloseConnection();
        }
    }
    public static object ScalarFromQuery(string s)
    {
        using var context = DatabaseContextFactory.CreateStockProcContext(ConnectionString);
        using var command = context.Database.GetDbConnection().CreateCommand();
        command.CommandText = s;
        command.CommandType = CommandType.Text;

        context.Database.OpenConnection();
        try
        {
            return command.ExecuteScalar();
        }
        finally
        {
            context.Database.CloseConnection();
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
