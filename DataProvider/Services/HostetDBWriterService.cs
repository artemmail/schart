using DataProvider.Models;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using StockProject.Models;

namespace DataProvider
{
    public class HostetDBWriterService : IHostedService, IDisposable
    {
        private readonly IBroadCast _broadCast;
        private readonly CancellationTokenSource _cancellationTokenSource = new CancellationTokenSource();
        private Task _executingTask;

        // Очереди для двух рынков
        public static ConcurrentQueue<DBRecord>[] sqlQueues = new ConcurrentQueue<DBRecord>[2]
        {
            new ConcurrentQueue<DBRecord>(),
            new ConcurrentQueue<DBRecord>()
        };

        public HostetDBWriterService(IBroadCast broadCast)
        {
            _broadCast = broadCast;
        }

        // Метод для добавления одной записи в очередь
        public static void Enqueue(int market, DBRecord record)
        {
            if (market < 0 || market >= sqlQueues.Length)
                throw new ArgumentOutOfRangeException(nameof(market), "Неверный индекс рынка.");

            sqlQueues[market].Enqueue(record);
        }

        // Метод для добавления нескольких записей в очередь
        public void Enqueue(int market, IEnumerable<DBRecord> records)
        {
            if (market < 0 || market >= sqlQueues.Length)
                throw new ArgumentOutOfRangeException(nameof(market), "Неверный индекс рынка.");

            foreach (var record in records)
                sqlQueues[market].Enqueue(record);
        }

        // Метод вставки данных в базу с реализацией повторных попыток
        public async Task InsertToDB(IEnumerable<DBRecord> queue, int market)
    {
        await Task.Run(() => DDEReciever1.InsertToDB(queue, market));
    }
