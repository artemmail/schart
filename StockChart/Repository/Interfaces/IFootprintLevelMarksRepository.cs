using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IFootprintLevelMarksRepository
    {
        Task<List<FootprintLevelMark>> GetMarksAsync(Guid userId, int tickerId);
        Task<FootprintLevelMark> UpsertMarkAsync(Guid userId, int tickerId, decimal price, string color, string comment);
        Task<bool> DeleteMarkAsync(Guid userId, int tickerId, decimal price);
        Task<int> DeleteMarksForTickerAsync(Guid userId, int tickerId);
    }
}
