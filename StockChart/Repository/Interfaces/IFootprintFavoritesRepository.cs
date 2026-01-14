using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IFootprintFavoritesRepository
    {
        Task<List<FootprintFavorite>> GetFavoritesAsync(Guid userId);
        Task<FootprintFavorite> CreateFavoriteAsync(Guid userId, string name, string paramsJson, int? presetIndex, Guid? favoriteId);
        Task<FootprintFavorite?> RenameFavoriteAsync(Guid userId, Guid favoriteId, string name);
        Task<bool> DeleteFavoriteAsync(Guid userId, Guid favoriteId);
    }
}
