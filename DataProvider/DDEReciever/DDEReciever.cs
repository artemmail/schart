using Binance.Net.Clients;
using DataProvider.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;

using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using StockChart.Data;
using StockChart.Model;
namespace StockProject.Models
{
    public static class DDEReciever1
    {
        static public void Run()
        {
        }
        public static Queue<DBRecord>[] sqlQueues = new Queue<DBRecord>[2];
        static int a = 0;
        public static IEnumerable<IEnumerable<T>> Split<T>(this IEnumerable<T> source, int chunkSize)
        {
            var chunk = new List<T>(chunkSize);
            foreach (var x in source)
            {
                chunk.Add(x);
                if (chunk.Count <= chunkSize)
                {
                    continue;
                }
                yield return chunk;
                chunk = new List<T>(chunkSize);
            }
            if (chunk.Any())
            {
                yield return chunk;
            }
        }

        public static void InsertToDB(IEnumerable<DBRecord> queue, int market)
        {
            string sql = "2";
            try
            {
                var r = queue.Where(x => !SQLHelper.TickerDic.ContainsKey(x.ticker)).GroupBy(x => x.ticker).Select(y => y.First()).ToArray();
                if (r.Any())
                    SQLHelper.DIC();
                var filteredRecords = queue.Select(record => new
                {
                    n = record.number,
                    i = SQLHelper.TickerDic[record.ticker].id,
                    d = record.datetime,
                    p = record.price,
                    q = record.quantity,
                    v = record.volume,
                    o = record.OI,
                    b = record.direction
                }).ToList();

                if (!filteredRecords.Any())
                    return;

                string json = JsonConvert.SerializeObject(filteredRecords);
                var jsonParameter = new SqlParameter("@json", SqlDbType.NVarChar)
                {
                    Value = json
                };

                sql = market == 20
                    ? @"DECLARE @json NVARCHAR(MAX) = @json
                            INSERT INTO tradesbinance (ID, number, TradeDate, Price, Quantity, Direction)
                            SELECT i, n, d, p, q, b FROM OPENJSON(@json, '$')
                            WITH(
                                n bigint '$.n',
                                i int '$.i',
                                d datetime2 '$.d',
                                p decimal(18, 6) '$.p',
                                q decimal(18, 6) '$.q',
                                v decimal(18, 6) '$.v',
                                o int '$.o',
                                b int '$.b'
                            );"
                    : @"DECLARE @json NVARCHAR(MAX) = @json
                            INSERT INTO trades (ID, number, TradeDate, Price, Quantity, Volume, OI, Direction)
                            SELECT i, n, d, p, q, v, o, b FROM OPENJSON(@json, '$')
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

                using var context = DatabaseContextFactory.CreateStockProcContext(SQLHelper.ConnectionString);
                context.Database.ExecuteSqlRaw(sql, jsonParameter);
                /*
                  using (StreamWriter sw = System.IO.File.AppendText("c:/log/sql" + market + ".txt"))
                  {
                      sw.WriteLine(sql);
                  }*/
            }
            catch (Exception e)
            {
                using (StreamWriter sw = System.IO.File.AppendText("c:/log/sql3.txt"))
                {
                    sw.WriteLine(sql);
                }
                using (StreamWriter sw = System.IO.File.AppendText("c:/log/throw2.txt"))
                {
                    sw.WriteLine(e.Message);
                    sw.WriteLine(e.StackTrace);
                    sw.WriteLine(e.Source);
                }
                throw e;
            }
        }
        public static Task fillDB(Queue<DBRecord> queue, int market)
        {
            bool full_queue;
            while (true)
            {
                lock (queue)
                {
                    full_queue = queue.Any();
                }
                if (full_queue)
                {
                    var x = new List<DBRecord>();
                    lock (queue)
                    {
                        int cnt = 1024 * 16;
                        while (queue.Any() && cnt-- > 0)
                            x.Add(queue.Dequeue());
                    }
                    InsertToDB(x, market);
                }
                else
                    Thread.Sleep(50);
            }
        }
        public static string qss()
        {
            var l = new List<int>();
            for (int i = 0; i < sqlQueues.Count(); i++)
                lock (sqlQueues[i])
                {
                    l.Add(sqlQueues[i].Count);
                }
            return JsonConvert.SerializeObject(l) + ' ' /*+ JsonConvert.SerializeObject(iqfeed.size())*/;
        }
        public static DBRecord[] RecordsFromFileSPB(string fileName)
        {
            GC.Collect();
            /*
            string fileName =
         //"C:/import/2022-10-03_LuaTOS.txt";
         "C:/spb/2021-02-11 SPB stock TOS.txt";*/
            var i1 = fileName.IndexOf('-');
            var y = fileName.Substring(i1 - 4, 4);
            var m = fileName.Substring(i1 + 1, 2);
            var d = fileName.Substring(i1 + 4, 2);
            var Date = new DateTime(int.Parse(y), int.Parse(m), int.Parse(d));
            int i = 0;
            var res = new List<DBRecord>();
            using (StreamReader reader = new StreamReader(fileName, Encoding.GetEncoding("Windows-1251"), true))
            {
                string line;
                while ((line = reader.ReadLine()) != null)
                {
                    line = line.Replace(",0:00:00", ",00:00:00");
                    line = line.Replace(", Inc.", ". Inc.");
                    line = line.Replace(',', ';');
                    var ix = line.IndexOf(";SPB:");
                    if (ix > 0)
                    {
                        int index = line.IndexOf(';', line.IndexOf(';') + 1) + 1;
                        var line1 = line.Substring(0, index);
                        var line2 = line.Substring(index, ix - index).Replace(';', ',');
                        var line3 = line.Substring(ix);
                        line = line1 + line2 + line3;
                    }
                    if (i >= 0)
                    {
                        //var a = line.Split('\t');
                        var a = line.Split(';');
                        if (a[15] != "")
                            res.Add(new DBRecord(Date, "UNKWN", a));
                    }
                    i++;
                }
            }
            return res.ToArray();
        }
        public static List<DBRecord> RecordsFromFileSPB2(string fileName)
        {
            GC.Collect();
            /*
            string fileName =
         //"C:/import/2022-10-03_LuaTOS.txt";
         "C:/spb/2021-02-11 SPB stock TOS.txt";*/
            var i1 = fileName.IndexOf('-');
            var y = fileName.Substring(i1 - 4, 4);
            var m = fileName.Substring(i1 + 1, 2);
            var d = fileName.Substring(i1 + 4, 2);
            var Date = new DateTime(int.Parse(y), int.Parse(m), int.Parse(d));
            int i = 0;
            var res = new List<DBRecord>();
            using (StreamReader reader = new StreamReader(fileName, Encoding.GetEncoding("Windows-1251"), true))
            {
                string line;
                while ((line = reader.ReadLine()) != null)
                {
                    if (i >= 1 && !line.Contains("STOCK_USA") && !line.Contains("лоты") && !line.Contains("INDXC"))
                    {
                        var a = line.Split('\t');
                        var t = new DBRecord(a);
                        if (t.datetime.Date == Date)
                            res.Add(t);
                    }
                    i++;
                }
            }
            return res;
        }
        public async static Task Upd()
        {
            using (var socketClient = new BinanceSocketClient())
            {
                string[] s = SQLHelper.TickerDic.Where(x => x.Value.market == 20).Select(x => x.Key).ToArray();
                var subscription = await socketClient.SpotApi.ExchangeData.SubscribeToTradeUpdatesAsync(s, data =>
                {
                    var d = data.Data;
                    DBRecord record = new DBRecord()
                    {
                        OI = 0,
                        datetime = new DateTime((d.TradeTime + TimeSpan.FromHours(3)).Ticks),
                        price = d.Price,
                        quantity = d.Quantity,
                        volume = d.Price * d.Quantity,
                        direction = d.BuyerIsMaker ? 0 : 1,
                        market = 20,
                        number = d.Id,
                        ticker = d.Symbol,
                        name = d.Symbol,
                        marketcode = "Binance"
                    };
                    lock (sqlQueues[1])
                    {
                        //  _tradesCacher.PushTrade(record.ticker, new Trade(record));
                        sqlQueues[1].Enqueue(record);
                    }
                    // Console.WriteLine($"{data.Data.Symbol} {data.Data.Id} {data.Data.TradeTime}: {data.Data.Quantity} @ {data.Data.Price}");
                });
                if (!subscription.Success)
                {
                    Console.WriteLine("Failed to sub: " + subscription.Error);
                    Console.ReadLine();
                    return;
                }
                while (subscription.Success) ;
                subscription.Data.ConnectionLost += () => Console.WriteLine("Connection lost, trying to reconnect..");
                subscription.Data.ConnectionRestored += (t) => Console.WriteLine("Connection restored");
                await socketClient.UnsubscribeAllAsync();
            }
        }
        static DDEReciever1()
        {
            for (int i = 0; i < sqlQueues.Length; i++)
                sqlQueues[i] = new Queue<DBRecord>();
            //            for (int i = 0; i < 4; i++)
            Task.Run(() => fillDB(sqlQueues[0], 0));
            Task.Run(() => fillDB(sqlQueues[1], 20));
            /*   Task.Run(() => fillDB(sqlQueues[1], 1));
               Task.Run(() => fillDB(sqlQueues[2], 2));
               Task.Run(() => fillDB(sqlQueues[3], 3));*/
        }
        public static void RecievRecoreds(DBRecord[] records)
        {
            StringBuilder sb = new StringBuilder();
            var r = records.Where(x => !SQLHelper.TickerDic.ContainsKey(x.ticker)).GroupBy(x => x.ticker).Select(y => y.First()).ToArray();
            if (r.Any())
            {
                SQLHelper.DIC();
                r = records.Where(x => !SQLHelper.TickerDic.ContainsKey(x.ticker)).GroupBy(x => x.ticker).Select(y => y.First()).ToArray();
                if (r.Any())
                {
                    using var context = DatabaseContextFactory.CreateStockProcContext(SQLHelper.ConnectionString);
                    var newDictionaries = r.Select(record => new Dictionary
                    {
                        Securityid = record.ticker,
                        Shortname = record.name,
                        Market = (byte)record.market,
                        ClassName = record.marketcode,
                        Minstep = 1,
                        Volperqnt = 1,
                        Lotsize = 1
                    }).ToList();

                    context.Dictionaries.AddRange(newDictionaries);
                    context.SaveChanges();
                    SQLHelper.DIC();
                }
                r = records.Where(x => !SQLHelper.TickerDic.ContainsKey(x.ticker)).GroupBy(x => x.ticker).Select(y => y.First()).ToArray();
            }
            foreach (DBRecord record in records)
            {
                TickerDIC ticker;
                lock (SQLHelper.TickerDic)
                    ticker = SQLHelper.TickerDic[record.ticker];
                //_tradesCacher.PushTrade(record.ticker, new Trade(record));
                if (LastIdsContainer.GetLastId(ticker.id) < record.number)
                {
                    lock (sqlQueues[0])
                        sqlQueues[0].Enqueue(record);

                    LastIdsContainer.UpdateLastId(ticker.id, record.number);
                }
            }
        }
    }
}
