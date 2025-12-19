using static StockChart.Repository.StockMarketServiceRepository;
namespace StockChart.Repository
{
    public interface IStockMarketServiceRepository
    {
        DateTime LastTradingDateCached(byte market);

        DateTime LastTradingDateTickerCached(string ticker);
        Task<decimal> GetLastPriceAsync(string ticker, DateTime startdate, DateTime enddate);
        Task<decimal> GetLastPriceAsync(string ticker);

        string Alias(string ticker);
        void UpdateAlias(ref string ticker);
        decimal DefaultStep(string ticker, DateTime startDate, DateTime endDate);
        DateTimePair init_start_end_date(string? ticker, string rperiod, DateTime? startDate, DateTime? endDate, byte market);
        TickerPreset CandlesParamsToObject(string ticker, decimal? priceStep, decimal? period, string rperiod, string startDate, string endDate,
            bool? timeEnable, string startTime, string endTime, bool? visualVolume, string type);

        FootPrintInitParams CandlesParamsToObjectNew(string? ticker, decimal? priceStep, decimal? period, string? rperiod, DateTime? startDate, DateTime? endDate, string type);


        DateTimePair getStartEndDateTime(string ticker, string rperiod, string startDate, string endDate, string from_stamp, string startTime, string endTime, bool timeEnable = false);

        DateTimePair getStartEndDateTime(string ticker, string? rperiod, DateTime? startDate, DateTime? endDate);

        object[] Presets(string type, string ticker);

        public  Task<object> TickerInfo(string ticker);
    }
}
