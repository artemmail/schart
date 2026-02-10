using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using static StockChart.Repository.ReportsRepository;
namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly ICandlesRepository _candlesRepository;
        private readonly IClusterRepository _clusterRepository;
        private readonly IStockMarketServiceRepository _stockMarketServiceRepository;
        private readonly ITickersRepository _tickers;
        private readonly IReportsRepository _reports;
        private readonly ICandlesRepositorySet _candlesRepositorySet;

        public ReportsController(
            ICandlesRepository candlesRepository,
            ICandlesRepositorySet candlesRepositorySet,
            ITickersRepository tickers,
            IReportsRepository reports,
            IClusterRepository clusterRepository,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            _candlesRepository = candlesRepository;
            _candlesRepositorySet = candlesRepositorySet;
            _tickers = tickers;
            _reports = reports;
            _clusterRepository = clusterRepository;
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }

        [HttpGet("Seasonality")]
        public async Task<object[][]> Seasonality(string ticker)
        {
            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            return await _candlesRepository.Seasonality(ticker);
        }

        [HttpGet("TopOrders")]
        public Task<List<TopOrdersResult>> TopOrders(string ticker, int bigPeriod) =>
            _reports.TopOrdersEf(ticker, bigPeriod);

        [HttpGet("TopOrdersMode")]
        public Task<List<TopOrdersResult>> TopOrdersMode(string ticker, int bigPeriod, string mode = "ef")
        {
            // Production lock: canonical path is EF implementation.
            mode = "ef";
            return _reports.TopOrdersEf(ticker, bigPeriod);
        }

        [HttpGet("TopOrdersPeriod")]
        public async Task<List<TopOrdersResult>> TopOrdersPeriod(string ticker, DateTime? startDate, DateTime? endDate, int topN = 200)
        {
            var dates = new DateTimePair(startDate, endDate);
            return await _reports.TopOrdersPeriodEf(ticker, dates.Start, dates.End, topN);
        }

        [HttpGet("TopOrdersPeriodMode")]
        public async Task<List<TopOrdersResult>> TopOrdersPeriodMode(string ticker, DateTime? startDate, DateTime? endDate, int topN = 200, string mode = "ef")
        {
            var dates = new DateTimePair(startDate, endDate);
            mode = "ef";
            return await _reports.TopOrdersPeriodEf(ticker, dates.Start, dates.End, topN);
        }

        [HttpGet("VolumeSplash")]
        public Task<List<candleseekerResult>> VolumeSplash(int bigPeriod, int smallPeriod, float splash = 3, byte market = 0) =>
            _reports.VolumeSplashEf(bigPeriod, smallPeriod, splash, market);

        [HttpGet("VolumeSplashMode")]
        public Task<List<candleseekerResult>> VolumeSplashMode(int bigPeriod, int smallPeriod, float splash = 3, byte market = 0, string mode = "ef")
        {
            mode = "ef";
            return _reports.VolumeSplashEf(bigPeriod, smallPeriod, splash, market);
        }

        [HttpGet("Leaders")]
        public async Task<IEnumerable<ReportLeader>> Leaders(DateTime? startDate, DateTime? endDate, string rperiod = "day", int top = 20, byte market = 0, int dir = 0)
        {
            var dates = GetDateRange(startDate, endDate, rperiod, market);
            return await _reports.MarketLeadersRepEf(dates.Start, dates.End, top, market, dir);
        }

        [HttpGet("LeadersMode")]
        public async Task<IEnumerable<ReportLeader>> LeadersMode(DateTime? startDate, DateTime? endDate, string rperiod = "day", int top = 20, byte market = 0, int dir = 0, string mode = "ef")
        {
            var dates = GetDateRange(startDate, endDate, rperiod, market);
            mode = "ef";
            return await _reports.MarketLeadersRepEf(dates.Start, dates.End, top, market, dir);
        }

        [HttpGet("MarketMap")]
        public async Task<object> MarketMap(DateTime? startDate, DateTime? endDate, string? categories, string rperiod = "day", int top = 50, byte market = 0)
        {
            var dates = GetDateRange(startDate, endDate, rperiod, market);
            var categoryIds = ParseCategories(categories);
            var result = await _reports.MarketMapEf(dates.Start, dates.End, top, market, categoryIds);
            return new List<object> { new { value = "00", items = result } };
        }

        [HttpGet("MarketMap2")]
        public async Task<List<MarketMapItem>> MarketMap2(DateTime? startDate, DateTime? endDate, string? categories, string rperiod = "day", int top = 50, byte market = 0)
        {
            var dates = GetDateRange(startDate, endDate, rperiod, market);
            var categoryIds = ParseCategories(categories);
            return await _reports.MarketMapEf(dates.Start, dates.End, top, market, categoryIds);
        }

        [HttpGet("MarketMap2Mode")]
        public async Task<List<MarketMapItem>> MarketMap2Mode(DateTime? startDate, DateTime? endDate, string? categories, string rperiod = "day", int top = 50, byte market = 0, string mode = "ef")
        {
            var dates = GetDateRange(startDate, endDate, rperiod, market);
            var categoryIds = ParseCategories(categories);
            mode = "ef";
            return await _reports.MarketMapEf(dates.Start, dates.End, top, market, categoryIds);
        }

        [HttpGet("MarketCandlesVolume")]
        public Task<List<MicexVolYearResult>> MarketCandlesVolume(int year, int year2, byte market, int group) =>
            _reports.MarketCandlesVolume(year, year2, market, group);

        [HttpGet("Barometer")]
        public async Task<ActionResult<List<Barometer>>> Barometer(byte market = 0, string? tickers = null)
        {
            var dates = new DateTimePair(DateTime.Now.Date.AddDays(-301), DateTime.Now.Date);
            if (!string.IsNullOrWhiteSpace(tickers))
            {
                var parsed = tickers
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                if (parsed.Count == 0)
                    return BadRequest(new { error = "tickers must contain at least one non-empty ticker" });

                return Ok(await _reports.BarometerByTickers(parsed, dates));
            }

            return Ok(await _reports.Barometer(market, dates));
        }


        [HttpGet("DashBoard")]
        public async Task<IReadOnlyList<VolumeDashboardRow>> DashBoard(byte market = 0)
        {
            var today = _stockMarketServiceRepository.LastTradingDateCached(market);    
            return await _reports.GetVolumeDashboardAsync(market, DateOnly.FromDateTime(today));
        }

        private DateTimePair GetDateRange(DateTime? startDate, DateTime? endDate, string rperiod, byte market)
        {
            if (string.IsNullOrEmpty(rperiod) && !startDate.HasValue)
                rperiod = "day";

            return _stockMarketServiceRepository.init_start_end_date(null, rperiod, startDate, endDate, market);
        }

        private HashSet<int> ParseCategories(string? categories)
        {
            return string.IsNullOrWhiteSpace(categories)
                ? new HashSet<int>()
                : categories.Split(',').Select(int.Parse).ToHashSet();
        }

    }
}
