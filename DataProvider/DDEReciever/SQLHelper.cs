using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;



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
    static SqlConnection sqlConn = new SqlConnection(SQLHelper.ConnectionString);
    public static void DIC()
    {
        var tab = SQLHelper.DataTableFromQuery("SELECT SECURITYID,market,id, lotsize  FROM [stock].[dbo].[Dictionary]");
        List<DicView> TickerList = SQLHelper.ConvertDataTable<DicView>(tab).Where(x => !TickerDic.ContainsKey(x.SECURITYID)).ToList();

        //TickerDic.Clear();
        foreach (var v in TickerList)
            TickerDic[v.SECURITYID] = new TickerDIC() { market = v.market, id = v.id, lotsize = v.lotsize };

    }
    static SQLHelper()
    {
        DIC();
    }

    public static List<MissingIntervalWithTrades> GetMissingIntervalsWithTrades(int specificId, DateTime startPeriod, DateTime endPeriod)
    {
        var result = new List<MissingIntervalWithTrades>();

        using (SqlConnection sqlConn = new SqlConnection(SQLHelper.ConnectionString))
        {
            using (SqlCommand cmd = new SqlCommand("sp_GetMissingTrades2", sqlConn))
            {
                cmd.CommandType = CommandType.StoredProcedure;

                // Добавляем параметры
                cmd.Parameters.Add(new SqlParameter("@SpecificID", SqlDbType.Int) { Value = specificId });
                cmd.Parameters.Add(new SqlParameter("@StartPeriod", SqlDbType.DateTime) { Value = startPeriod });
                cmd.Parameters.Add(new SqlParameter("@EndPeriod", SqlDbType.DateTime) { Value = endPeriod });

                sqlConn.Open();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var interval = new MissingIntervalWithTrades
                        {
                            MissingStart = reader["MissingStart"] != DBNull.Value ? (DateTime)reader["MissingStart"] : default,
                            MissingEnd = reader["MissingEnd"] != DBNull.Value ? (DateTime)reader["MissingEnd"] : default,
                            BeforeGapTradeNumber = reader["BeforeGapTradeNumber"] != DBNull.Value ? (long?)reader["BeforeGapTradeNumber"] : null,
                            BeforeGapTradeDate = reader["BeforeGapTradeDate"] != DBNull.Value ? (DateTime?)reader["BeforeGapTradeDate"] : null,
                            AfterGapTradeNumber = reader["AfterGapTradeNumber"] != DBNull.Value ? (long?)reader["AfterGapTradeNumber"] : null,
                            AfterGapTradeDate = reader["AfterGapTradeDate"] != DBNull.Value ? (DateTime?)reader["AfterGapTradeDate"] : null
                        };

                        result.Add(interval);
                    }
                }
            }
        }

        return result;
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
        using (SqlConnection sqlConn = new SqlConnection(ConnectionString))
        {
            sqlConn.Open();
            SqlCommand cmd = new SqlCommand(s, sqlConn);
            SqlDataReader reader = cmd.ExecuteReader();
            DataTable dt = new DataTable();
            dt.Load(reader);
            return dt;
        }
    }
    public static object ScalarFromQuery(string s)
    {
        using (SqlConnection sqlConn = new SqlConnection(ConnectionString))
        {
            sqlConn.Open();
            SqlCommand cmd = new SqlCommand(s, sqlConn);
            return cmd.ExecuteScalar();
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
