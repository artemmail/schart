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

        [HttpGet]
        [Route("getRange")]
        [RefererFilter]
        public async Task<object> getRange(string? ticker, string? rperiod, string? startDate, string? endDate, string? startTime, string? endTime,
             string? from_stamp, bool? packed, int count = 2000, int z = 0, double period = 15, bool timeEnable = false)
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
            var t =
                glued ?
                await _candlesRepository.GetCandlesGlued(ticker.Substring(0, 2) + "##", (int)period, res.Start, res.End, 1000) :
                await _candlesRepository.GetCandles(ticker, period, res.Start, res.End, 1000);
            return CandlePacker.PackCandlesResult(t, false);
        }
        [HttpGet]
        [Route("getStats")]
        public async Task<object> getStats(string? ticker, string? rperiod, string? startDate, string? endDate, string? startTime, string? endTime,
             string? from_stamp, bool? packed, int count = 2000, int z = 0, double period = 15, bool timeEnable = false)
        {
            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            var res = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, from_stamp, startTime, endTime, timeEnable);
            var candles = await _candlesRepository.GetCandles(ticker, (int)period, res.Start, res.End, 10000);

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
        public async Task<object> getRangeSet(string? ticker, string? ticker1, string? ticker2, string? rperiod, string? startDate, string? endDate, string? startTime, string? endTime,
            string? from_stamp, bool? packed, int count = 2000, double period = 15, bool timeEnable = false)
        {
            if (!string.IsNullOrEmpty(ticker))
            {
                ticker = _tickersRepository.CorrectFormula(ticker);
            }

            var res = _stockMarketServiceRepository.getStartEndDateTime(ticker, rperiod, startDate, endDate, from_stamp, startTime, endTime, timeEnable);
            var t = await _candlesRepositorySet.GetRangeSet(ticker, ticker1, ticker2, (int)period, res, 1000);
            return t;
        }

    }
}
