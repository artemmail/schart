using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Repository
{
    public class SettingsRepository : ISettingsRepository
    {
        private readonly StockProcContext _dbContext;
        private readonly IUsersRepository _usersRepository;
        private readonly Guid _rutickerId = new Guid("C568752A-2FCD-43BE-A9F3-AC65FAAD194C");

        public SettingsRepository(StockProcContext dbContext, IUsersRepository usersRepository)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _usersRepository = usersRepository ?? throw new ArgumentNullException(nameof(usersRepository));
        }

        public async Task<ChartSettings> GetChartSettingsAsync(ApplicationUser? user, int id)
        {
            return await _dbContext.ChartSettings.FindAsync(id);
        }

        public async Task<List<ChartSettings>> GetChartSettingsForUserAsync(ApplicationUser? user)
        {
            var userId = user?.Id ?? _rutickerId;

            if (!_usersRepository.IsPayed(user, 1))
            {
                var x = await _dbContext.ChartSettings

                .Where(x => x.UserId == userId || x.UserId == _rutickerId)
                .OrderByDescending(x => x.CandlesOnly)
                .ToListAsync();

                return x;
            }

            return await _dbContext.ChartSettings
                .Where(x => x.UserId == userId || x.UserId == _rutickerId)
                .OrderByDescending(x => x.Default)
                .ThenByDescending(x => x.LastSelection)
                .ToListAsync();
        }

        public async Task<ChartSettings?> GetDefaultSettingsAsync(ApplicationUser? user, string ticker)
        {
            if (user == null || !_usersRepository.IsPayed(user, ticker))
            {
                return await _dbContext.ChartSettings
                    .Where(x => x.CandlesOnly && x.UserId == _rutickerId)
                    .FirstOrDefaultAsync();
            }

            var userId = user.Id;
            return await _dbContext.ChartSettings
                .Where(x => x.UserId == userId || x.UserId == _rutickerId)
                .OrderByDescending(x => x.Default)
                .ThenByDescending(x => x.LastSelection)
                .FirstOrDefaultAsync();
        }

        public async Task SaveChartSettingsAsync(ApplicationUser user, int id)
        {
            var chartSettings = await _dbContext.ChartSettings
                .Where(x => x.UserId == user.Id && x.Id == id)
                .FirstOrDefaultAsync();

            if (chartSettings == null)
                throw new Exception("Не удалось сохранить настройки - у пользователя нет прав");

            await SetDefaultChartSettingsAsync(user.Id);

            chartSettings.Default = true;
            chartSettings.LastUpdate = DateTime.Now;
            chartSettings.LastSelection = DateTime.Now;
            _dbContext.Update(chartSettings);
            await _dbContext.SaveChangesAsync();
        }

        public async Task DeleteChartSettingsAsync(ApplicationUser user, ChartSettingsDTO dto)
        {
            var chartSettings = await _dbContext.ChartSettings
                .Where(x => x.Name.Equals(dto.Name) && x.UserId == user.Id)
                .FirstOrDefaultAsync();

            if (chartSettings == null)
                throw new Exception("Не удалось удалить ChartSettings - у пользователя нет прав");

            _dbContext.Remove(chartSettings);
            await _dbContext.SaveChangesAsync();
        }

        public async Task<ChartSettings> CreateChartSettingsAsync(ApplicationUser user, ChartSettingsDTO dto)
        {
            var userId = user.Id;
            var chartSettings = await GetChartSettingsByNameAndUserIdAsync(dto.Name, userId);

            if (dto.Default)
            {
                await SetDefaultChartSettingsAsync(userId);
            }

            if (chartSettings != null)
            {
                dto.CopyFromSettingsDTO(chartSettings);
                _dbContext.Update(chartSettings);
            }
            else
            {
                chartSettings = new ChartSettings { UserId = userId };
                dto.CopyFromSettingsDTO(chartSettings);
                _dbContext.Add(chartSettings);
            }



            await _dbContext.SaveChangesAsync();
            return chartSettings;
        }

        private async Task SetDefaultChartSettingsAsync(Guid userId)
        {
            var existingDefaults = await _dbContext.ChartSettings
                .Where(x => x.UserId == userId && x.Default)
                .ToListAsync();

            foreach (var existingDefault in existingDefaults)
            {
                existingDefault.Default = false;
                _dbContext.Update(existingDefault);
            }
        }

        private async Task<ChartSettings?> GetChartSettingsByNameAndUserIdAsync(string name, Guid userId)
        {
            var chartSettings = await _dbContext.ChartSettings
                .Where(x => x.Name.Equals(name) && x.UserId == userId)
                .FirstOrDefaultAsync();

            /*       if (chartSettings != null) return chartSettings;

                   var chartSettingsRut = await _dbContext.ChartSettings
                       .Where(x => x.Name.Equals(name) && x.UserId == _rutickerId)
                       .FirstOrDefaultAsync();

                   if (chartSettingsRut != null && userId != _rutickerId)
                   {
                       var newName = $"{name}({userId})";
                       chartSettings = await _dbContext.ChartSettings
                           .Where(x => x.Name.Equals(newName) && x.UserId == userId)
                           .FirstOrDefaultAsync();
                   }
            */
            return chartSettings;
        }
    }
}
