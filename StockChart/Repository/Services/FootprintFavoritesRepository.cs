using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Repository.Services
{
    public class FootprintFavoritesRepository : IFootprintFavoritesRepository
    {
        private readonly StockProcContext _dbContext;

        public FootprintFavoritesRepository(StockProcContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }

        public async Task<List<FootprintFavorite>> GetFavoritesAsync(Guid userId)
        {
            return await _dbContext.FootprintFavorites
                .Where(favorite => favorite.UserId == userId)
                .OrderBy(favorite => favorite.CreatedAt)
                .ToListAsync();
        }

        public async Task<FootprintFavorite> CreateFavoriteAsync(
            Guid userId,
            string name,
            string paramsJson,
            int? presetIndex,
            Guid? favoriteId)
        {
            var now = DateTime.UtcNow;
            var favorite = new FootprintFavorite
            {
                Id = favoriteId ?? Guid.NewGuid(),
                UserId = userId,
                Name = name,
                ParamsJson = paramsJson,
                PresetIndex = presetIndex,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _dbContext.FootprintFavorites.Add(favorite);
            await _dbContext.SaveChangesAsync();
            return favorite;
        }

        public async Task<FootprintFavorite?> RenameFavoriteAsync(Guid userId, Guid favoriteId, string name)
        {
            var favorite = await _dbContext.FootprintFavorites
                .FirstOrDefaultAsync(item => item.Id == favoriteId && item.UserId == userId);

            if (favorite == null)
            {
                return null;
            }

            favorite.Name = name;
            favorite.UpdatedAt = DateTime.UtcNow;
            _dbContext.Update(favorite);
            await _dbContext.SaveChangesAsync();
            return favorite;
        }

        public async Task<bool> DeleteFavoriteAsync(Guid userId, Guid favoriteId)
        {
            var favorite = await _dbContext.FootprintFavorites
                .FirstOrDefaultAsync(item => item.Id == favoriteId && item.UserId == userId);

            if (favorite == null)
            {
                return false;
            }

            _dbContext.FootprintFavorites.Remove(favorite);
            await _dbContext.SaveChangesAsync();
            return true;
        }
    }
}
