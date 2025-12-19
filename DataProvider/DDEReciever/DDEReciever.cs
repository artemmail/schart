using Binance.Net.Clients;
using DataProvider.Models;
using Newtonsoft.Json;
using StockChart.Model;
using TradeEntity = StockChart.Model.Trade;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
namespace StockProject.Models
{
    public class CL
    {
        public byte MarketId { get; set; }
        public string Name { get; set; }
    }
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
            var records = queue.ToList();
            using var context = SQLHelper.CreateContext();

            if (market == 20)
            {
                var trades = records.Select(record => new Tradesbinance
                {
                    Id = SQLHelper.TickerDic[record.ticker].id,
                    Number = record.number,
                    TradeDate = record.datetime,
                    Price = record.price,
                    Quantity = (decimal)record.quantity,
                    Direction = (byte)(record.direction > 0 ? 1 : 0)
                }).ToList();

                context.Tradesbinances.AddRange(trades);
            }
            else
            {
                var trades = records.Select(record => new TradeEntity
                {
                    Id = SQLHelper.TickerDic[record.ticker].id,
                    Number = record.number,
                    TradeDate = record.datetime,
                    Price = record.price,
                    Quantity = record.quantity,
                    Volume = record.volume,
                    Oi = record.OI,
                    Direction = (byte)(record.direction > 0 ? 1 : 0)
                }).ToList();

                context.Trades.AddRange(trades);
            }

            context.SaveChanges();
        }

    }
}
