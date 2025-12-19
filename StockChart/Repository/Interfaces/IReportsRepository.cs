using StockChart.Model;
using static StockChart.Repository.ReportsRepository;
using static StockProcContext;
namespace StockChart.Repository
{
    public interface IReportsRepository
    {
        public Task<IReadOnlyList<VolumeDashboardRow>> GetVolumeDashboardAsync(byte market, DateOnly today);
        public Task<List<Barometer>> Barometer(byte market, DateTimePair dates);
        public Task<List<MicexVolYearResult>> MarketCandlesVolume(int year, int year2, byte market, int group);
        public Task<List<candleseekerResult>> VolumeSplash(int bigPeriod, int smallPeriod, float splash = 3, byte market = 0);
        public Task<List<TopOrdersResult>> TopOrders(string ticker, int bigPeriod);
        public Task<List<TopOrdersResult>> TopOrdersPeriod(string ticker, DateTime startDate, DateTime endDate, int topN = 200);
        public Task<List<MarketMapItem>> MarketMap(DateTime startDate, DateTime endDate, int top, byte market, HashSet<int> CatIds);
        public Task<List<ReportLeader>> MarketLeadersRep(DateTime startDate, DateTime endDate, int top, byte market, int dir, int colorModel = 0);
        public Task<List<StockProcContext.MarketMapPeriod4Result>> MarketLeaders(DateTime startDate, DateTime endDate, int top, byte market, int dir);
    }
}