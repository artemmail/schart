


using DataProvider.Models;
using DataProvider.Services;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using StockChart.Data;
using StockChart.Model;

public class MissingIntervalsFetcherService : IHostedService, IDisposable
{
    private readonly CancellationTokenSource _cancellationTokenSource = new();
    private Task _executingTask;
    private static readonly HttpClient httpClient = new HttpClient();

    private DateTime startPeriod = DateTime.Now.Date.AddDays(-1);
    private DateTime endPeriod = DateTime.Now.Date.AddDays(+1);

    private int market = 20; // фиксируем market в 20
    private const string BinanceApiUrl = "https://api.binance.com/api/v3/aggTrades";

    // Задаём количество параллельных потоков
    private const int MAX_THREADS = 3;




    public Task StartAsync(CancellationToken cancellationToken)
    {
        // Запускаем выполнение в отдельном таске
        _executingTask = Task.Run(async () =>
        {
            //   return;
            try
            {
                // 1) Собираем список тикеров для market = 20 и начинающихся на "BTCUS"
                var s = MarketInfoServiceHolder.GetTickers()
                    .Where(x => x.Value.market == 20)
                    //.Where(x => x.Key.StartsWith("BTCUS"))
                    .OrderBy(x => x.Key)
                    .Select(x => new { ticker = x.Key, id = x.Value.id })
                    //.Take(210) или
                    // .Skip(127)
                    .ToArray();

                // 2) Готовим семафор для ограничения числа параллельных задач
                var throttler = new SemaphoreSlim(MAX_THREADS);

                // 3) Список для тасков
                var tasks = new List<Task>();

                foreach (var x in s)
                {
                    // Дожидаемся свободного слота в семафоре
                    await throttler.WaitAsync(_cancellationTokenSource.Token);

                    // Запускаем таск с «тяжёлой» логикой
                    tasks.Add(Task.Run(async () =>
                    {
                        try
                        {
                            var ticker = x.ticker;
                            var specificId = x.id;

                            // Запрашиваем недостающие интервалы
                            using var context = DatabaseContextFactory.CreateStockProcContext(SQLHelper.ConnectionString);
                            var missingIntervals = context.GetMissingIntervalsWithTrades(specificId, startPeriod, endPeriod);

                            // Разбиваем интервалы по дням и фильтруем
                            missingIntervals = SQLHelper
                                .SplitIntervalsByDay(missingIntervals)
                                .Where(m => m.MissingEnd != m.MissingStart)
                                .ToList();

                            // Перебираем каждый недостающий интервал
                            foreach (var interval in missingIntervals)
                            {
                                // Вычисляем start/end с «запасом»
                                DateTime fetchStart = interval.BeforeGapTradeDate?.AddSeconds(-1)
                                                      ?? interval.MissingStart;
                                DateTime fetchEnd = interval.AfterGapTradeDate?.AddSeconds(1)
                                                      ?? interval.MissingEnd;

                                // Получаем сделки по API
                                var trades = await FetchTradesForIntervalAsync(ticker, fetchStart, fetchEnd);

                                if (trades.Count > 0)
                                {
                                    // Фильтрация по реальному промежутку (если есть номера сделок до и после)
                                    List<BinanceTrade> filteredTrades;
                                    if (interval.BeforeGapTradeNumber.HasValue && interval.AfterGapTradeNumber.HasValue)
                                    {
                                        filteredTrades = trades.Where(t =>
                                            t.Number >= interval.BeforeGapTradeNumber &&
                                            t.Number <= interval.AfterGapTradeNumber).ToList();
                                    }
                                    else if (interval.BeforeGapTradeNumber.HasValue)
                                    {
                                        filteredTrades = trades.Where(t =>
                                            t.Number >= interval.BeforeGapTradeNumber).ToList();
                                    }
                                    else if (interval.AfterGapTradeNumber.HasValue)
                                    {
                                        filteredTrades = trades.Where(t =>
                                            t.Number <= interval.AfterGapTradeNumber).ToList();
                                    }
                                    else
                                    {
                                        filteredTrades = trades.ToList();
                                    }

                                    if (filteredTrades.Any())
                                    {
                                        // Превращаем в «DBRecord»
                                        var dbRecords = filteredTrades.Select(t => new DBRecord
                                        {
                                            ticker = ticker,
                                            datetime = t.TradeDate,
                                            price = t.Price,
                                            quantity = t.Quantity,
                                            volume = t.Price * t.Quantity,
                                            OI = 0,
                                            direction = t.Direction,
                                            number = t.Number,
                                            market = 20,
                                            marketcode = "BINANCE",
                                            name = ticker
                                        }).ToList();

                                        // И записываем в базу
                                        await InsertTradesToDB(dbRecords);
                                    }
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Ошибка при обработке тикера {x.ticker}: {ex.Message}");
                            // Дополнительно логируем в файл при необходимости
                        }
                        finally
                        {
                            // Освобождаем слот в семафоре
                            throttler.Release();
                        }
                    }, _cancellationTokenSource.Token));
                }

                // 4) Дожидаемся завершения всех тасков
                await Task.WhenAll(tasks);
            }
            catch (Exception ex)
            {
                // Если на этапе формирования списка или еще где-то произойдёт ошибка
                Console.WriteLine($"Ошибка в MissingIntervalsFetcherService: {ex.Message}");
            }
        }, _cancellationTokenSource.Token);

        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_executingTask == null)
            return;

        _cancellationTokenSource.Cancel();
        await Task.WhenAny(_executingTask, Task.Delay(Timeout.Infinite, cancellationToken));
    }

    public void Dispose()
    {
        _cancellationTokenSource.Cancel();
    }

    /// <summary>
    /// Получение сделок за указанный интервал.
    /// </summary>
    private async Task<List<BinanceTrade>> FetchTradesForIntervalAsync(string symbol, DateTime start, DateTime end)
    {
        var allTrades = new List<BinanceTrade>();
        DateTime currentStart = start;
        int limit = 1000;
        long lastnum = 0;
        long las = 0;

        while (currentStart < end)
        {
            var trades = await FetchAggTrades(symbol, currentStart, end, limit, las);
            if (trades == null || trades.Count == 0)
                break;


            // Добавляем только действительно новые сделки
            allTrades.AddRange(trades.Where(x => x.Number > lastnum && x.TradeDate < end));

            var lastTradeTimeMs = trades.Max(t => t.TradeTimeMs);
            var lastTradeTime = DateTimeOffset.FromUnixTimeMilliseconds(lastTradeTimeMs).DateTime;

            currentStart = lastTradeTime;

            if (lastnum == allTrades.Last().Number)
                currentStart += TimeSpan.FromMilliseconds(1);

            lastnum = allTrades.Last().Number;
            las = trades.Last().Number2;

            if (trades.Count < limit)
                break;

            await Task.Delay(10);
        }

        return allTrades;
    }

    private async Task<List<BinanceTrade>> FetchAggTrades(string symbol, DateTime start, DateTime end, int limit, long fromId = 0)
    {
        var url = $"{BinanceApiUrl}?symbol={symbol}&limit={limit}";
        if (fromId != 0)
            url += $"&fromId={fromId}";
        else
            url += $"&startTime={ToUnixMs(start.AddHours(3))}&endTime={ToUnixMs(end.AddHours(3))}";
        for (int retry = 0; retry < 5; retry++)
        {
            try
            {
                var response = await httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var tradesJson = JsonConvert.DeserializeObject<List<BinanceAggTradeJson>>(json);
                    return tradesJson.SelectMany(MapToBinanceTrade).ToList();
                }
                else if ((int)response.StatusCode == 429)
                {
                    Console.WriteLine("Rate limit exceeded. Retrying...");
                    await Task.Delay(1000);
                }
                else
                {
                    var a = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Error: {response.StatusCode} - {a}");
                    break;
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"Exception occurred: {e.Message}. Retrying...");
                await Task.Delay(1000);
            }
        }
        return null;
    }

    private static long ToUnixMs(DateTime dt) => new DateTimeOffset(dt).ToUnixTimeMilliseconds();

    private IEnumerable<BinanceTrade> MapToBinanceTrade(BinanceAggTradeJson json)
    {
        int direction = json.m ? 0 : 1;
        var tradeDate = DateTimeOffset.FromUnixTimeMilliseconds(json.T).DateTime;
        long countOfTradesInAgg = json.l - json.f + 1;

        // Если в агрегированном трейде сразу несколько сделок, делим количество и объём пропорционально
        for (int i = 0; i < countOfTradesInAgg; i++)
        {
            yield return new BinanceTrade
            {
                Number = json.f + i,
                Number2 = json.a,
                Price = decimal.Parse(json.p, System.Globalization.CultureInfo.InvariantCulture),
                Quantity = decimal.Parse(json.q, System.Globalization.CultureInfo.InvariantCulture) / countOfTradesInAgg,
                Direction = direction,
                TradeTimeMs = json.T,
                TradeDate = tradeDate
            };
        }
    }

    /// <summary>
    /// Вставка данных в БД в таблицу tradesbinance (market=20)
    /// </summary>
    private async Task InsertTradesToDB(IEnumerable<DBRecord> records)
    {
        const int maxRetries = 5;
        const int batchSize = 10000;
        TimeSpan delay = TimeSpan.FromSeconds(5);

        var recordsList = records.ToList();
        if (!recordsList.Any()) return;

        // Разбиваем записи на батчи
        var batches = recordsList
            .Select((record, index) => new { record, index })
            .GroupBy(x => x.index / batchSize, x => x.record)
            .ToList();

        foreach (var batch in batches)
        {
            int retryCount = 0;
            while (true)
            {
                try
                {
                    var batchPayload = batch.Select(r =>
                    {
                        if (!MarketInfoServiceHolder.TryGetTicker(r.ticker, out var tickerInfo))
                            throw new InvalidOperationException($"Ticker info not found for {r.ticker}");

                        return new
                        {
                            n = r.number,
                            i = tickerInfo.id,
                            d = r.datetime,
                            p = r.price,
                            q = r.quantity,
                            v = r.volume,
                            o = r.OI,
                            b = r.direction
                        };
                    }).ToList();

                    string json = JsonConvert.SerializeObject(batchPayload);

                    string sql = $@"
                    DECLARE @json NVARCHAR(MAX) = @jsonParam
                    INSERT INTO tradesbinance
                    SELECT i, n, d, p, q, b
                    FROM OPENJSON(@json, '$')
                    WITH(
                        n bigint       '$.n',
                        i int          '$.i',
                        d datetime2    '$.d',
                        p decimal(18,6)'$.p',
                        q decimal(18,6)'$.q',
                        v decimal(18,6)'$.v',
                        o int          '$.o',
                        b int          '$.b'
                    )";

                    var jsonParameter = new SqlParameter("@jsonParam", System.Data.SqlDbType.NVarChar)
                    {
                        Value = json
                    };

                    using var context = DatabaseContextFactory.CreateStockProcContext(SQLHelper.ConnectionString);
                    await context.Database.ExecuteSqlRawAsync(sql, jsonParameter);
                    break; // Успешная вставка, переходим к следующему батчу
                }
                catch (SqlException ex) when (IsTransient(ex))
                {
                    retryCount++;
                    if (retryCount > maxRetries)
                    {
                        LogError(ex, $"Превышено число попыток вставки для market={market}");
                        throw;
                    }

                    LogRetryAttempt(retryCount, delay, ex, $"Market={market}");
                    await Task.Delay(delay);
                    // Увеличиваем delay в геометрической прогрессии
                    delay = TimeSpan.FromSeconds(delay.TotalSeconds * 2);
                }
                catch (Exception e)
                {
                    LogError(e, $"Неизвестная ошибка при вставке данных для market={market}");
                    throw;
                }
            }
        }
    }

    private bool IsTransient(SqlException ex)
    {
        // Логика определения транзиентности SQL-ошибки,
        // но для примера можно вернуть true
        return true;
    }

    private void LogRetryAttempt(int retryCount, TimeSpan delay, Exception ex, string context)
    {
        try
        {
            using (StreamWriter sw = File.AppendText("c:/log/retry_log.txt"))
            {
                sw.WriteLine($"[{DateTime.Now}] Попытка {retryCount} не удалась. Повтор через {delay.TotalSeconds} сек.");
                sw.WriteLine($"Контекст: {context}");
                sw.WriteLine($"Ошибка: {ex.Message}");
                sw.WriteLine($"Стек трейс: {ex.StackTrace}");
                sw.WriteLine(new string('-', 50));
            }
        }
        catch
        {
            // игнорируем ошибки логирования
        }
    }

    private void LogError(Exception ex, string context)
    {
        try
        {
            using (StreamWriter sw = File.AppendText("c:/log/throw2.txt"))
            {
                sw.WriteLine($"[{DateTime.Now}] Контекст: {context}");
                sw.WriteLine($"Ошибка: {ex.Message}");
                sw.WriteLine($"Стек трейс: {ex.StackTrace}");
                sw.WriteLine($"Источник: {ex.Source}");
                sw.WriteLine(new string('-', 50));
            }
        }
        catch
        {
            // игнорируем ошибки логирования
        }
    }
}

// Модели
public class BinanceAggTradeJson
{
    public long a { get; set; } // AggTradeId
    public string p { get; set; } // Price
    public string q { get; set; } // Quantity
    public long f { get; set; } // FirstTradeId
    public long l { get; set; } // LastTradeId
    public long T { get; set; } // TradeTime in ms
    public bool m { get; set; } // IsMaker
    public bool M { get; set; } // Ignore
}

public class BinanceTrade
{
    public long Number { get; set; }
    public long Number2 { get; set; }
    public decimal Price { get; set; }
    public decimal Quantity { get; set; }
    public int Direction { get; set; }
    public long TradeTimeMs { get; set; }
    public DateTime TradeDate { get; set; }
}

// Примерная модель для БД
