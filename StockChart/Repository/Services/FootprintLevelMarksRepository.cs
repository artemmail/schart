using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Repository.Services
{
    public class FootprintLevelMarksRepository : IFootprintLevelMarksRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public FootprintLevelMarksRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }

        public async Task<List<FootprintLevelMark>> GetMarksAsync(Guid userId, int tickerId)
        {
            return await _dbContext.FootprintLevelMarks
                .Where(mark => mark.UserId == userId && mark.TickerId == tickerId)
                .OrderBy(mark => mark.Price)
                .ToListAsync();
        }

        public async Task<FootprintLevelMark> UpsertMarkAsync(Guid userId, int tickerId, decimal price, string color, string comment)
        {
            var mark = await _dbContext.FootprintLevelMarks
                .FirstOrDefaultAsync(item => item.UserId == userId && item.TickerId == tickerId && item.Price == price);

            if (mark == null)
            {
                mark = new FootprintLevelMark
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    TickerId = tickerId,
                    Price = price,
                    Color = color,
                    Comment = comment,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };
                _dbContext.FootprintLevelMarks.Add(mark);
            }
            else
            {
                mark.Color = color;
                mark.Comment = comment;
                mark.UpdatedAt = DateTime.UtcNow;
                _dbContext.FootprintLevelMarks.Update(mark);
            }

            await _dbContext.SaveChangesAsync();
            return mark;
        }

        public async Task<bool> DeleteMarkAsync(Guid userId, int tickerId, decimal price)
        {
            var mark = await _dbContext.FootprintLevelMarks
                .FirstOrDefaultAsync(item => item.UserId == userId && item.TickerId == tickerId && item.Price == price);

            if (mark == null)
            {
                return false;
            }

            _dbContext.FootprintLevelMarks.Remove(mark);
            await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<int> DeleteMarksForTickerAsync(Guid userId, int tickerId)
        {
            var marks = await _dbContext.FootprintLevelMarks
                .Where(item => item.UserId == userId && item.TickerId == tickerId)
                .ToListAsync();

            if (marks.Count == 0)
            {
                return 0;
            }

            _dbContext.FootprintLevelMarks.RemoveRange(marks);
            await _dbContext.SaveChangesAsync();
            return marks.Count;
        }
    }
}
