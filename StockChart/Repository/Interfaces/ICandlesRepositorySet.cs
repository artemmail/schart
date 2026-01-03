using StockChart.EventBus.Models;
using StockChart.Model;

namespace StockChart.Repository
{
    public interface ICandlesRepositorySet
    {
        // New method

        public Task<CandlesRangeSetResult> GetRangeSet(
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
