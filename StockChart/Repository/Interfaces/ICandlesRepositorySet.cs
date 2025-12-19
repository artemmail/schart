using StockChart.EventBus.Models;

namespace StockChart.Repository
{
    public interface ICandlesRepositorySet
    {
        // New method

        public Task<object> GetRangeSet(
           string ticker,
           string ticker1,
           string ticker2,
           double period,
           DateTimePair dateTimePair,
           int top);


        public  Task<List<ClusterColumnBase>> GetRangeSetBase(
           string ticker,
           string ticker1,
           string ticker2,
           double period,
           DateTimePair dateTimePair,
           int top);
    }
}
