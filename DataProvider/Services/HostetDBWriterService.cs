using DataProvider.Models;
using DataProvider.Services;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using StockChart.Data;
using StockChart.Model;
using Trade = StockChart.Model.Trade;

namespace DataProvider
{
    public class HostetDBWriterService : IHostedService, IDisposable
    {
        private readonly IBroadCast _broadCast;
        private readonly IDbContextFactory<StockProcContext> _contextFactory;
        private readonly ILastTradeCache _lastTradeCache;
        private readonly CancellationTokenSource _cancellationTokenSource = new CancellationTokenSource();
        private Task _executingTask;
        private record struct TradeMaxInfo(int TickerId, long MaxNumber, DateTime MaxTime);

        // Очереди для двух рынков
        public static ConcurrentQueue<DBRecord>[] sqlQueues = new ConcurrentQueue<DBRecord>[2]
        {
            new ConcurrentQueue<DBRecord>(),
            new ConcurrentQueue<DBRecord>()
        };

        public HostetDBWriterService(IBroadCast broadCast, IDbContextFactory<StockProcContext> contextFactory, ILastTradeCache lastTradeCache)
        {
            _broadCast = broadCast;
            _contextFactory = contextFactory;
            _lastTradeCache = lastTradeCache;
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
                    using var context = await _contextFactory.CreateDbContextAsync();
                    var tickerDictionary = MarketInfoServiceHolder.GetTickers();

                    // Обработка данных для рынка 0
                    if (market == 0)
                    {
                        var newDictionaryRecords = queue
                            .Where(x => !tickerDictionary.ContainsKey(x.ticker))
                            .GroupBy(x => x.ticker)
                            .Select(g => g.First())
                            .Select(record => new Dictionary
                            {
                                Securityid = record.ticker,
                                Shortname = record.name,
                                Fullname = record.name,
                                FromDate = record.datetime,
                                ToDate = null,
                                Market = (byte)record.market,
                                Oldid = null,
                                ClassName = record.marketcode,
                                Minstep = 1m,
                                Volperqnt = 1m,
                                ClassId = null,
                                CategoryTypeId = 1,
                                Lotsize = null,
                                Currency = null,
                                Scale = null,
                                Isin = null
                            })
                            .ToList();

                        if (newDictionaryRecords.Any())
                        {
                            context.Dictionaries.AddRange(newDictionaryRecords);
                            await context.SaveChangesAsync();
                            MarketInfoServiceHolder.RefreshTickers();
                            tickerDictionary = MarketInfoServiceHolder.GetTickers();
                        }
                    }

                    var filteredRecords = queue
                        .Where(x => x.price > 0.0001m || market == 0)
                        .Select(record =>
                        {
                            if (!tickerDictionary.TryGetValue(record.ticker, out var tickerInfo))
                                throw new InvalidOperationException($"Ticker info not found for {record.ticker}");

                            return new
                            {
                                TickerId = tickerInfo.id,
                                record.number,
                                record.datetime,
                                record.price,
                                record.quantity,
                                record.volume,
                                record.OI,
                                record.direction
                            };
                        })
                        .ToList();

                    if (!filteredRecords.Any())
                        break;

                    if (market == 1)
                    {
                        var binanceRecords = filteredRecords
                            .Select(x => new Tradesbinance
                            {
                                Id = x.TickerId,
                                Number = x.number,
                                TradeDate = x.datetime,
                                Price = x.price,
                                Quantity = x.quantity,
                                Direction = (byte)x.direction
                            })
                            .ToList();

                        await context.InsertTradesBinanceBatchAsync(binanceRecords);
                    }
                    else
                    {
                        var trades = filteredRecords
                            .Select(x => new Trade
                            {
                                Id = x.TickerId,
                                Number = x.number,
                                TradeDate = x.datetime,
                                Price = x.price,
                                Quantity = (int)x.quantity,
                                Volume = x.volume,
                                Oi = x.OI,
                                Direction = (byte)x.direction
                            })
                            .ToList();

                        await context.InsertTradesBatchAsync(trades);
                    }                                  

                    // Если все прошло успешно, выходим из цикла
                    break;
                }
                catch (Exception ex) when (GetSqlException(ex) is SqlException sqlException && IsTransient(sqlException))
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

        private SqlException GetSqlException(Exception ex)
        {
            return ex as SqlException ?? ex.GetBaseException() as SqlException;
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
