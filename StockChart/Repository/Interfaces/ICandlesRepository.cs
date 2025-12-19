using StockChart.EventBus.Models;
using StockChart.Model;
namespace StockChart.Repository
{
    public interface ICandlesRepository
    {
        Task<List<Candle>> GetCandlesGlued(string ticker, int period, DateTime startDate, DateTime endDate, int top);

        Task<List<ClusterColumnBase>> GetCandlesGlued1(string ticker, int period, DateTime startDate, DateTime endDate, int top);

        Task<List<Candle>> GetCandles(string ticker, double period, DateTime startDate, DateTime endDate, int top);

        Task<List<ClusterColumnBase>> GetTradesCandles(string ticker, DateTime startDate, DateTime endDate);

        Task<List<ClusterColumnWCF>> GetTradesClusters(string ticker, DateTime startDate, DateTime endDate, decimal m_priceStep);


        Task<List<Candle>> GetLastCandles(int tickerid, double period, int top);
        Task<object[][]> Seasonality(string ticker);
        Task<List<Candle>> GetLastCandlesQuick(string ticker, double period, int top);
        Task<List<Candle>> GetCandlesQuick(string ticker, double period, DateTime startDate, DateTime endDate, int top);
        //     Task<Dictionary<SubsCandle, List<BaseCandle>>> CandlesQueryBatch(SubsCandle[] array, int count);
        Task<List<ClusterColumnBase>> ClusterProfileQuery(string ticker, decimal period, DateTimePair Dates, decimal step, bool Postmarket);
        Task<List<tick>> GetTicksQuick(string ticker, DateTime startDate, DateTime endDate);
        Task<List<tick>> GetTicks(string ticker, DateTime startDate, DateTime endDate);

    }
}
