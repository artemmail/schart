using System.Collections.Concurrent;
namespace StockChart.Repository
{
    public interface ITickersRepository
    {
        StockChart.Model.Dictionary this[string key] { get; }
        ConcurrentDictionary<string, StockChart.Model.Dictionary> Tickers { get; }
        ConcurrentDictionary<int, StockChart.Model.Dictionary> TickersById { get; }
        string[] TickersFromFormula(string formula);
        string CorrectFormula(string formula);
        public IEnumerable<Model.Dictionary> findByMask(string mask, int count);
        public ConcurrentDictionary<byte, Model.Market> MarketById { get; }
    }
}
