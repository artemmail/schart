using DataProvider.Models;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

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
            const int maxRetries = 5; // Максимальное количество попыток
            int retryCount = 0;
            TimeSpan delay = TimeSpan.FromSeconds(5); // Начальная задержка

            while (true)
            {
                try
                {
                    string sql = "2"; // Изначальное значение SQL-запроса

                    // Обработка данных для рынка 0
                    if (market == 0)
                    {
                        var recordsToInsert = queue
                            .Where(x => !SQLHelper.TickerDic.ContainsKey(x.ticker))
                            .GroupBy(x => x.ticker)
                            .Select(g => g.First())
                            .ToArray();

                        if (recordsToInsert.Any())
                        {
                            using (var sqlCon = new SqlConnection(SQLHelper.ConnectionString))
                            {
                                await sqlCon.OpenAsync();

                                foreach (var record in recordsToInsert)
                                {
                                    using (var cmd = new SqlCommand(@"
INSERT INTO [dbo].[Dictionary]
    ([SECURITYID], [SHORTNAME], [from_date], [to_date], [Market], [oldid],
     [ClassName], [minstep], [volperqnt], [ClassId], [CategoryTypeId],
     [lotsize], [currency], [scale], [isin], [Fullname])
VALUES
    (@securityId, @shortName, @fromDate, NULL, @market, NULL,
     @className, @minStep, @volPerQnt, @classId, @categoryTypeId,
     @lotSize, @currency, @scale, @isin, @fullName);
", sqlCon))
                                    {
                                        // 1. SECURITYID
                                        cmd.Parameters.Add("@securityId", SqlDbType.NVarChar, 32)
                                           .Value = record.ticker;

                                        // 2. SHORTNAME и Fullname (одно и то же поле дважды)
                                        var escapedName = record.name; // экранирование внутри AddWithValue не нужно
                                        cmd.Parameters.Add("@shortName", SqlDbType.NVarChar, -1)
                                           .Value = escapedName;
                                        cmd.Parameters.Add("@fullName", SqlDbType.NVarChar, -1)
                                           .Value = escapedName;

                                        // 3. from_date
                                        cmd.Parameters.Add("@fromDate", SqlDbType.DateTime)
                                           .Value = record.datetime;

                                        // 4. to_date — оставляем NULL
                                        // 5. Market
                                        cmd.Parameters.Add("@market", SqlDbType.TinyInt)
                                           .Value = record.market;

                                        // 6. oldid — оставляем NULL

                                        // 7. ClassName
                                        cmd.Parameters.Add("@className", SqlDbType.NVarChar)
                                           .Value = record.marketcode;

                                        // 8. minstep и volperqnt — в исходнике стояли константы 1
                                        cmd.Parameters.Add("@minStep", SqlDbType.Decimal)
                                           .Value = 1m;
                                        cmd.Parameters.Add("@volPerQnt", SqlDbType.Decimal)
                                           .Value = 1m;

                                        // 9–11. ClassId, CategoryTypeId, lotsize
                                        cmd.Parameters.Add("@classId", SqlDbType.Int)
                                           .Value = DBNull.Value;
                                        cmd.Parameters.Add("@categoryTypeId", SqlDbType.Int)
                                           .Value = 1;
                                        cmd.Parameters.Add("@lotSize", SqlDbType.Int)
                                           .Value = DBNull.Value;

                                        // 12–14. currency, scale, isin
                                        cmd.Parameters.Add("@currency", SqlDbType.NVarChar, 32)
                                           .Value = DBNull.Value;
                                        cmd.Parameters.Add("@scale", SqlDbType.Int)
                                           .Value = DBNull.Value;
                                        cmd.Parameters.Add("@isin", SqlDbType.NVarChar, 32)
                                           .Value = DBNull.Value;

                                        await cmd.ExecuteNonQueryAsync();
                                    }
                                }
                            }

                            // Обновляем кэш после вставки
                            SQLHelper.DIC();
                        }
                    }

                    // Сериализация данных в JSON
                    string json = JsonConvert.SerializeObject(queue.Where(x => x.price > 0.0001m || market == 0).Select(record => new
                    {
                        n = record.number,
                        i = SQLHelper.TickerDic[record.ticker].id,
                        d = record.datetime,
                        p = record.price,
                        q = record.quantity,
                        v = record.volume,
                        o = record.OI,
                        b = record.direction
                    }));

                    // Формирование SQL-запроса в зависимости от рынка
                    if (market == 1)
                    {
                        sql = $@"DECLARE @json NVARCHAR(MAX) 
                                 SET @json = N'{json}'
                                 INSERT INTO tradesbinance
                                 SELECT i, n, d, p, q, b 
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
                                 )";
                    }
                    else
                    {
                        sql = $@"DECLARE @json NVARCHAR(MAX) 
                                 SET @json = N'{json}'
                                 INSERT INTO trades
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
                                 )";
                    }

                    // Выполнение SQL-запроса
                    using (SqlConnection sqlCon = new SqlConnection(SQLHelper.ConnectionString))
                    {
                        await sqlCon.OpenAsync();
                        using (SqlCommand cmd2 = new SqlCommand(sql, sqlCon))
                        {
                            await cmd2.ExecuteNonQueryAsync();
                        }
                    }

                    // Если все прошло успешно, выходим из цикла
                    break;
                }
                catch (SqlException ex) when (IsTransient(ex))
                {
                    retryCount++;
                    if (retryCount > maxRetries)
                    {
                        // Логируем ошибку после превышения количества попыток
                        LogError(ex, $"Превышено количество попыток для SQL-запроса на рынке {market}.");
                        throw; // Повторно выбрасываем исключение после превышения попыток
                    }

                    // Логируем информацию о попытке повтора
                    LogRetryAttempt(retryCount, delay, ex, $"Магазин: {market}");

                    // Ждем перед следующей попыткой
                    await Task.Delay(delay);

                    // Увеличиваем задержку (экспоненциальный бэк-офф)
                    delay = TimeSpan.FromSeconds(delay.TotalSeconds * 2);
                }
                catch (Exception e)
                {
                    // Обрабатываем другие исключения
                    LogError(e, $"Неизвестная ошибка при выполнении SQL-запроса на рынке {market}.");
                    throw;
                }
            }
        }

        // Метод для заполнения базы данных из очереди
        public async Task fillDB(ConcurrentQueue<DBRecord> queue, int market)
        {
            if (queue.Any())
            {
                var recordsToInsert = new List<DBRecord>();
                lock (queue)
                {
                    int cnt = 1024 * 16; // Максимальное количество записей за раз
                    while (queue.Any() && cnt-- > 0)
                    {
                        if (queue.TryDequeue(out DBRecord rec))
                            recordsToInsert.Add(rec);
                    }
                }

                // Одновременное выполнение вставки в базу и трансляции свечей
                await Task.WhenAll(
                    InsertToDB(recordsToInsert, market),
                    _broadCast.BroadCastCandles(recordsToInsert.Select(x => x.ticker).ToHashSet())
                );
            }
        }

        // Метод запуска сервиса
        public Task StartAsync(CancellationToken stoppingToken)
        {
            _executingTask = Task.Run(async () =>
            {
                while (!_cancellationTokenSource.IsCancellationRequested)
                {
                    await fillDB(sqlQueues[0], 0);
                    await fillDB(sqlQueues[1], 1);

                    if (!sqlQueues[0].Any() && !sqlQueues[1].Any())
                        await Task.Delay(50, _cancellationTokenSource.Token);
                }
            }, _cancellationTokenSource.Token);

            return Task.CompletedTask;
        }

        // Метод остановки сервиса
        public async Task StopAsync(CancellationToken cancellationToken)
        {
            if (_executingTask == null)
                return;

            // Инициация отмены
            _cancellationTokenSource.Cancel();

            // Ожидание завершения задачи
            await Task.WhenAny(_executingTask, Task.Delay(Timeout.Infinite, cancellationToken));
        }

        // Метод освобождения ресурсов
        public void Dispose()
        {
            _cancellationTokenSource.Cancel();
        }

        // Метод определения, является ли ошибка временной
        private bool IsTransient(SqlException ex)
        {
            // Добавьте другие номера ошибок по мере необходимости
            return true;//  ..ex.Number == 19;
        }

        // Метод логирования попыток повтора
        private void LogRetryAttempt(int retryCount, TimeSpan delay, Exception ex, string context)
        {
            try
            {
                using (StreamWriter sw = File.AppendText("c:/log/retry_log.txt"))
                {
                    sw.WriteLine($"[{DateTime.Now}] Попытка {retryCount} не удалась. Повтор через {delay.TotalSeconds} секунд.");
                    sw.WriteLine($"Контекст: {context}");
                    sw.WriteLine($"Сообщение ошибки: {ex.Message}");
                    sw.WriteLine($"Стек трейс: {ex.StackTrace}");
                    sw.WriteLine(new string('-', 50));
                }
            }
            catch
            {
                // Игнорируем ошибки логирования, чтобы не прерывать основной процесс
            }
        }

        // Метод логирования ошибок
        private void LogError(Exception ex, string context)
        {
            try
            {
                using (StreamWriter sw = File.AppendText("c:/log/throw2.txt"))
                {
                    sw.WriteLine($"[{DateTime.Now}] Контекст: {context}");
                    sw.WriteLine($"Сообщение ошибки: {ex.Message}");
                    sw.WriteLine($"Стек трейс: {ex.StackTrace}");
                    sw.WriteLine($"Источник: {ex.Source}");
                    sw.WriteLine(new string('-', 50));
                }
            }
            catch
            {
                // Игнорируем ошибки логирования, чтобы не прерывать основной процесс
            }
        }
    }
}
