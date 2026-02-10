using Microsoft.AspNetCore.Mvc;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Services;
using System.Text.RegularExpressions;
namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CandlesController : Controller
    {
        ICandlesRepository _candlesRepository;
        IClusterRepository _clusterRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        ITickersRepository _tickersRepository;
        IReportsRepository _reports;
        ICandlesRepositorySet _candlesRepositorySet;
        public CandlesController(
            ICandlesRepository candlesRepository,
            ICandlesRepositorySet candlesRepositorySet,
            ITickersRepository tickers,
            IReportsRepository reports,
            IClusterRepository clusterRepository,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            _candlesRepositorySet = candlesRepositorySet;
            _clusterRepository = clusterRepository;
            _tickersRepository = tickers;
            _reports = reports;
            _candlesRepository = candlesRepository;
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }

        private static bool TryResolvePeriod(string? periodParam, out double period, out string? error)
        {
            error = null;
            if (string.IsNullOrWhiteSpace(periodParam))
            {
                period = 15;
                return true;
            }

            if (CandlePeriodParser.TryParse(periodParam, out period))
            {
                return true;
            }

            error = "Invalid `period`. Use numeric minutes (e.g. 15, 60, 1440, 10080, 30000) or timeframe codes like m1, m5, h1, d1, w1, MN1/M.";
            return false;
        }

        [HttpGet]
        [Route("getRange")]
        [RefererFilter]
        public async Task<object> getRange(string? ticker, string? rperiod, string? startDate, string? endDate, string? startTime, string? endTime,
             string? from_stamp, bool? packed, int count = 2000, int z = 0, string? period = "15", bool timeEnable = false)
        {
            bool glued = false;
            if (!string.IsNullOrWhiteSpace(ticker) && ticker.Length == 4 && ticker.Contains("##"))
            {
                ticker = ticker.Substring(0, 2);
                glued = true;
            }

            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            Regex r = new Regex("[*\\-+\\/()]", RegexOptions.IgnoreCase);
            if (!_tickersRepository.Tickers.ContainsKey(ticker) && r.Match(ticker).Success)
                return await getRangeSet(ticker, null, null, rperiod, startDate, endDate, startTime, endTime,
                from_stamp, packed, count, period, timeEnable);
            var res = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, from_stamp, startTime, endTime, timeEnable);

            if (!TryResolvePeriod(period, out var resolvedPeriod, out var error))
            {
                return BadRequest(error);
            }

            var t =
                glued ?
                await _candlesRepository.GetCandlesGlued(ticker.Substring(0, 2) + "##", (int)resolvedPeriod, res.Start, res.End, 1000) :
                await _candlesRepository.GetCandles(ticker, resolvedPeriod, res.Start, res.End, 1000);
            t = NormalizeMonthlyOrder(t, resolvedPeriod);
            return CandlePacker.PackCandlesResult(t, false);
        }

        [HttpGet]
        [Route("getRangeMode")]
        [RefererFilter]
        public async Task<object> getRangeMode(string? ticker, string? rperiod, string? startDate, string? endDate, string? startTime, string? endTime,
             string? from_stamp, bool? packed, int count = 2000, int z = 0, string? period = "15", bool timeEnable = false, string mode = "ef")
        {
            bool glued = false;
            if (!string.IsNullOrWhiteSpace(ticker) && ticker.Length == 4 && ticker.Contains("##"))
            {
                ticker = ticker.Substring(0, 2);
                glued = true;
            }

            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            Regex r = new Regex("[*\\-+\\/()]", RegexOptions.IgnoreCase);
            if (!_tickersRepository.Tickers.ContainsKey(ticker) && r.Match(ticker).Success)
                return await getRangeSet(ticker, null, null, rperiod, startDate, endDate, startTime, endTime,
                from_stamp, packed, count, period, timeEnable);
            var res = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, from_stamp, startTime, endTime, timeEnable);

            if (!TryResolvePeriod(period, out var resolvedPeriod, out var error))
            {
                return BadRequest(error);
            }

            // Production lock: canonical path is EF implementation.
            mode = "ef";
            var t =
                glued
                    ? await _candlesRepository.GetCandlesGlued(ticker.Substring(0, 2) + "##", (int)resolvedPeriod, res.Start, res.End, 1000)
                    : await _candlesRepository.GetCandles(ticker, resolvedPeriod, res.Start, res.End, 1000);
            t = NormalizeMonthlyOrder(t, resolvedPeriod);

            return CandlePacker.PackCandlesResult(t, false);
        }
        [HttpGet]
        [Route("getStats")]
        public async Task<object> getStats(string? ticker, string? rperiod, string? startDate, string? endDate, string? startTime, string? endTime,
             string? from_stamp, bool? packed, int count = 2000, int z = 0, string? period = "15", bool timeEnable = false)
        {
            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            var res = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, from_stamp, startTime, endTime, timeEnable);

            if (!TryResolvePeriod(period, out var resolvedPeriod, out var error))
            {
                return BadRequest(error);
            }

            var candles = await _candlesRepository.GetCandles(ticker, (int)resolvedPeriod, res.Start, res.End, 10000);

            CandlesStatistic stat = new CandlesStatistic(candles);
            return
                new
                {
                    VolumeStat = stat.GroupByTime(),
                    ATRStat = stat.AtrStat(),
                    Series = stat.SeriesStat()
                };
        }
        [HttpGet]
        [Route("getRangeSet")]
        public async Task<ActionResult<CandlesRangeSetResult>> getRangeSet(string? ticker, string? ticker1, string? ticker2, string? rperiod, string? startDate, string? endDate, string? startTime, string? endTime,
            string? from_stamp, bool? packed, int count = 2000, string? period = "15", bool timeEnable = false)
        {
            try
            {
                if (!string.IsNullOrEmpty(ticker))
                {
                    ticker = _tickersRepository.CorrectFormula(ticker);
                }

                var res = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, from_stamp, startTime, endTime, timeEnable);

                if (!TryResolvePeriod(period, out var resolvedPeriod, out var error))
                {
                    return BadRequest(error);
                }

                var t = await _candlesRepositorySet.GetRangeSet(ticker, ticker1, ticker2, (int)resolvedPeriod, res, 1000);
                return Ok(t);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        [Route("getRangeSetArray")]
        public async Task<ActionResult<CandlesRangeSetValue[]>> getRangeSetArray(string? ticker, string? ticker1, string? ticker2, string? rperiod, string? startDate, string? endDate, string? startTime, string? endTime,
            string? from_stamp, bool? packed, int count = 2000, string? period = "15", bool timeEnable = false)
        {
            try
            {
                if (!string.IsNullOrEmpty(ticker))
                {
                    ticker = _tickersRepository.CorrectFormula(ticker);
                }

                var res = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, from_stamp, startTime, endTime, timeEnable);

                if (!TryResolvePeriod(period, out var resolvedPeriod, out var error))
                {
                    return BadRequest(error);
                }

                var t = await _candlesRepositorySet.GetRangeSetArray(ticker, ticker1, ticker2, (int)resolvedPeriod, res, 1000);
                return Ok(t);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        private static List<Candle> NormalizeMonthlyOrder(List<Candle> candles, double period)
        {
            if (period < 30000 || candles.Count <= 1)
                return candles;

            return candles
                .OrderBy(x => x.Period)
                .ThenBy(x => x.Id)
                .ThenBy(x => x.OpnPrice)
                .ThenBy(x => x.ClsPrice)
                .ThenBy(x => x.MinPrice)
                .ThenBy(x => x.MaxPrice)
                .ThenBy(x => x.Volume)
                .ThenBy(x => x.BuyVolume)
                .ThenBy(x => x.Quantity)
                .ThenBy(x => x.BuyQuantity)
                .ThenBy(x => x.Oi)
                .ToList();
        }

    }
}
