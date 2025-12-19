using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using StockChart.EventBus.Models;

using StockChart.Extentions;
using StockChart.Model;
using System.Collections.Concurrent;
using System.Text;

namespace StockChart.Repository
{
    public class CandlesRepositorySet : ICandlesRepositorySet
    {
        private readonly StockProcContext _dbContext;
        private readonly ITickersRepository _tickersRepository;
        private readonly IStockMarketServiceRepository _stockMarketService;

        public CandlesRepositorySet(
            StockProcContext dbContext,
            ITickersRepository tickersRepository,
            IStockMarketServiceRepository stockMarketService)
        {
            _dbContext = dbContext;
            _tickersRepository = tickersRepository;
            _stockMarketService = stockMarketService;
        }

        public async Task<List<Candle>> GetCandles(
            string ticker,
            int period,
            DateTime startDate,
            DateTime endDate,
            int top)
        {
            return await _dbContext.GetCandlesAsync(ticker, period, startDate, endDate, top);
        }

        public List<BaseCandle>[] AdjustCandlesSet(List<BaseCandle>[] candleSets)
        {
            int numberOfSets = candleSets.Length;
            var candlesByPeriod = new Dictionary<DateTime, BaseCandle[]>();

            for (int i = 0; i < numberOfSets; i++)
            {
                foreach (var candle in candleSets[i])
                {
                    if (!candlesByPeriod.ContainsKey(candle.Period))
                        candlesByPeriod[candle.Period] = new BaseCandle[numberOfSets];

                    candlesByPeriod[candle.Period][i] = candle;
                }
            }

            var adjustedSets = new List<BaseCandle>[numberOfSets];
            var periods = candlesByPeriod.Keys.ToList();
            periods.Sort();
            int periodCount = periods.Count;

            for (int i = 0; i < numberOfSets; i++)
            {
                var adjustedCandles = new BaseCandle[periodCount];

                for (int j = 0; j < periodCount; j++)
                    adjustedCandles[j] = candlesByPeriod[periods[j]][i];

                BaseCandle lastCandle = null;

                for (int j = 1; j < periodCount; j++)
                {
                    lastCandle = adjustedCandles[j] ?? lastCandle;
                    if (adjustedCandles[j] == null && lastCandle != null)
                    {
                        adjustedCandles[j] = new BaseCandle
                        {
                            Period = periods[j],
                            MinPrice = lastCandle.ClsPrice,
                            MaxPrice = lastCandle.ClsPrice,
                            OpnPrice = lastCandle.ClsPrice,
                            ClsPrice = lastCandle.ClsPrice
                        };
                    }
                }

                lastCandle = null;
                for (int j = periodCount - 1; j >= 0; j--)
                {
                    lastCandle = adjustedCandles[j] ?? lastCandle;
                    if (adjustedCandles[j] == null && lastCandle != null)
                    {
                        adjustedCandles[j] = new BaseCandle
                        {
                            Period = periods[j],
                            MinPrice = lastCandle.OpnPrice,
                            MaxPrice = lastCandle.OpnPrice,
                            OpnPrice = lastCandle.OpnPrice,
                            ClsPrice = lastCandle.OpnPrice
                        };
                    }
                }

                adjustedSets[i] = adjustedCandles.ToList();
            }

            return adjustedSets;
        }

        private static string GenerateFormulaLine(
            string expression,
            string[] tickers,
            string propertyName,
            bool useDoubleResult)
        {
            foreach (var (ticker, index) in tickers.Select((t, i) => (t, i)))
            {
                string deltaReplacement = useDoubleResult
                    ? $"(double)(Deltas[{index}][i])"
                    : $"Deltas[{index}][i]";
                expression = expression.Replace($"Delta({ticker})", deltaReplacement);

                string tickerReplacement = useDoubleResult
                    ? $"(double)(set[{index}][i].{propertyName})"
                    : $"set[{index}][i].{propertyName}";
                expression = expression.Replace(ticker, tickerReplacement);
            }

            return $"result[i].{propertyName} = (decimal)({expression});\n";
        }

        public static List<decimal> CalculateDelta(List<BaseCandle> candles)
        {
            var deltas = new List<decimal>();
            decimal cumulativeDelta = 0;

            foreach (var candle in candles)
            {
                decimal delta = candle.BuyVolume - (candle.Volume - candle.BuyVolume);
                cumulativeDelta += delta;
                deltas.Add(cumulativeDelta);
            }

            return deltas;
        }

        private static readonly ConcurrentDictionary<string, dynamic> _cachedAssemblies
            = new ConcurrentDictionary<string, dynamic>();

        public static dynamic CreateFunction(
            string expression,
            string[] tickers,
            bool isClsOnly)
        {
            string key = $"{expression}_{string.Join(' ', tickers)}_{isClsOnly}";
            return _cachedAssemblies.GetOrAdd(key, _ => CreateFunctionImpl(expression, tickers, isClsOnly));
        }

        private static dynamic CreateFunctionImpl(
            string expression,
            string[] tickers,
            bool isClsOnly)
        {
            string codeTemplate = @"

using System.Collections.Generic;
using StockChart.EventBus.Models;

namespace UserFunctions
{
    public class ExpressionCompiler
    {
        public BaseCandle[] CalcExpression(
            List<BaseCandle>[] set,
            List<decimal>[] Deltas = null)
        {
            BaseCandle[] result = new BaseCandle[set[0].Count];
            for (int i = 0; i < result.Length; i++)
            {
                result[i] = new BaseCandle();
                result[i].Period = set[0][i].Period;
                CODE
            }
            return result;
        }
    }
}
";

            bool useDoubleResult = expression.Contains('(');
            var codeBuilder = new StringBuilder();
            codeBuilder.Append(GenerateFormulaLine(expression, tickers, "ClsPrice", useDoubleResult));

            if (!isClsOnly)
            {
                codeBuilder.Append(GenerateFormulaLine(expression, tickers, "MinPrice", useDoubleResult));
                codeBuilder.Append(GenerateFormulaLine(expression, tickers, "MaxPrice", useDoubleResult));
                codeBuilder.Append(GenerateFormulaLine(expression, tickers, "OpnPrice", useDoubleResult));
                codeBuilder.Append(GenerateFormulaLine(expression, tickers, "Volume", useDoubleResult));
                codeBuilder.Append(GenerateFormulaLine(expression, tickers, "Quantity", useDoubleResult));
            }

            string finalCode = codeTemplate.Replace("CODE", codeBuilder.ToString());

            // Используем только имя файла без пути и недопустимых символов
            string assemblyName = $"{Guid.NewGuid():N}.dll";
            string assemblyPath = Path.GetDirectoryName(typeof(object).Assembly.Location);
            string systemRuntimePath = Path.Combine(assemblyPath, "System.Runtime.dll");

            var syntaxTree = CSharpSyntaxTree.ParseText(finalCode);
            var compilation = CreateCompilation(syntaxTree, assemblyName)
                .AddReferences(MetadataReference.CreateFromFile(systemRuntimePath))
                .AddReferences(MetadataReference.CreateFromFile(typeof(DateTime).Assembly.Location))
                .AddReferences(MetadataReference.CreateFromFile(typeof(BaseCandle).Assembly.Location))
                .AddReferences(MetadataReference.CreateFromFile(typeof(List<BaseCandle>).Assembly.Location));

            var emitResult = compilation.Emit(assemblyName);

            if (!emitResult.Success)
            {
                var errors = string.Join(Environment.NewLine, emitResult.Diagnostics
                    .Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
                    .Select(diagnostic => diagnostic.ToString()));
                throw new InvalidOperationException($"Compilation failed:\n{errors}");
            }

            try
            {
                dynamic compiledFunction = Activator.CreateInstanceFrom(
                    assemblyName,
                    "UserFunctions.ExpressionCompiler").Unwrap();
                return compiledFunction;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to create instance from assembly: {ex.Message}", ex);
            }
        }

        private static CSharpCompilation CreateCompilation(SyntaxTree syntaxTree, string assemblyName) =>
            CSharpCompilation.Create(
                assemblyName,
                options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary))
            .AddReferences(MetadataReference.CreateFromFile(typeof(string).Assembly.Location))
            .AddSyntaxTrees(syntaxTree);

        public async Task<object> GetRangeSet(
      string ticker,
      string ticker1,
      string ticker2,
      double period,
      DateTimePair dateTimePair,
      int top)
        {

            if(!string.IsNullOrEmpty(ticker))
            {
               ticker = _tickersRepository.CorrectFormula(ticker);
            }

            if (!string.IsNullOrEmpty(ticker1))
            {
                ticker1 = _tickersRepository.CorrectFormula(ticker1);
            }

            if (!string.IsNullOrEmpty(ticker2))
            {
                ticker2 = _tickersRepository.CorrectFormula(ticker2);
            }



            string[] tickers = string.IsNullOrEmpty(ticker)
                ? _tickersRepository.TickersFromFormula($"{ticker1}+{ticker2}")
                : _tickersRepository.TickersFromFormula(ticker);

            var results = new List<BaseCandle>[tickers.Length];
            var candleSets = new List<BaseCandle>[tickers.Length];
            var deltas = new List<decimal>[tickers.Length];

            // Получаем свечи и преобразуем их в BaseCandle
            for (int i = 0; i < tickers.Length; i++)
            {
                string currentTicker = tickers[i];
                _stockMarketService.UpdateAlias(ref currentTicker);
                var candles = await _dbContext.GetCandlesAsync(
                    currentTicker,
                    period,
                    dateTimePair.Start,
                    dateTimePair.End,
                    top);

                results[i] = candles.Select(c => (BaseCandle)c).ToList();
            }

            // Инициализируем наборы свечей и вычисляем дельты
            for (int i = 0; i < tickers.Length; i++)
            {
                candleSets[i] = results[i];
                deltas[i] = CalculateDelta(results[i]);
            }

            // Корректируем наборы свечей
            candleSets = AdjustCandlesSet(candleSets);

            // Пересчитываем дельты после корректировки
            for (int i = 0; i < tickers.Length; i++)
            {
                deltas[i] = CalculateDelta(candleSets[i]);
            }

            if (string.IsNullOrEmpty(ticker))
            {
                // Если тикер пустой, вычисляем две выражения
                var function1 = CreateFunction(ticker1, tickers, true);
                var function2 = CreateFunction(ticker2, tickers, true);

                var result1 = (BaseCandle[])function1.CalcExpression(candleSets, deltas);
                var result2 = (BaseCandle[])function2.CalcExpression(candleSets, deltas);

                var price1 = result1.Select(x => x.ClsPrice).ToArray();
                var price2 = result2.Select(x => x.ClsPrice).ToArray();
                var dates = result1.Select(x => x.Period.ToJavaScriptMinutes());

                return new
                {
                    price1,
                    price2,
                    Date = dates
                };
            }
            else
            {
                // Вычисляем выражение для тикера
                var function = CreateFunction(ticker, tickers, false);
                var result = (BaseCandle[])function.CalcExpression(candleSets, deltas);

                // Проверяем, может ли CandlePacker.PackCandlesResult работать с BaseCandle
                // Если нет, преобразуем BaseCandle в Candle
                
                return CandlePacker.PackCandlesResult(result.ToList(), false);
                
            }
        }



        public async Task<List<ClusterColumnBase>> GetRangeSetBase(
            string ticker,
            string ticker1,
            string ticker2,
            double period,
            DateTimePair dateTimePair,
            int top)
        {
            string[] tickers = string.IsNullOrEmpty(ticker)
                ? _tickersRepository.TickersFromFormula($"{ticker1}+{ticker2}")
                : _tickersRepository.TickersFromFormula(ticker);

            var results = new List<BaseCandle>[tickers.Length];
            var candleSets = new List<BaseCandle>[tickers.Length];
            var deltas = new List<decimal>[tickers.Length];

            for (int i = 0; i < tickers.Length; i++)
            {
                string currentTicker = tickers[i];
                _stockMarketService.UpdateAlias(ref currentTicker);
                results[i] = (await _dbContext.GetCandlesAsync(
                    currentTicker,
                    period,
                    dateTimePair.Start,
                    dateTimePair.End,
                    top)).Select(c => (BaseCandle)c).ToList();
            }

            for (int i = 0; i < tickers.Length; i++)
            {
                candleSets[i] = results[i];
                deltas[i] = CalculateDelta(results[i]);
            }

            candleSets = AdjustCandlesSet(candleSets);

            for (int i = 0; i < tickers.Length; i++)
            {
                deltas[i] = CalculateDelta(candleSets[i]);
            }

            var function = CreateFunction(ticker ?? $"{ticker1}+{ticker2}", tickers, string.IsNullOrEmpty(ticker));

            BaseCandle[] baseCandles;

            if (string.IsNullOrEmpty(ticker))
            {
                var function1 = CreateFunction(ticker1, tickers, true);
                var function2 = CreateFunction(ticker2, tickers, true);
                var result1 = (BaseCandle[])function1.CalcExpression(candleSets, deltas);
                var result2 = (BaseCandle[])function2.CalcExpression(candleSets, deltas);

                // Объединение результатов по вашему усмотрению
                baseCandles = result1; // Для примера
            }
            else
            {
                baseCandles = (BaseCandle[])function.CalcExpression(candleSets, deltas);
            }

            // Маппинг полей из BaseCandle в ClusterColumnBase
            var clusterColumns = baseCandles.Select(candle => new ClusterColumnBase
            {
                x = candle.Period,
                o = candle.OpnPrice,
                c = candle.ClsPrice,
                l = candle.MinPrice,
                h = candle.MaxPrice,
                v = candle.Volume,
                bv = candle.BuyVolume,
                q = candle.Quantity,
                bq = candle.BuyQuantity,
                oi = candle.Oi
            }).ToList();

            return clusterColumns;
        }
    }
}
