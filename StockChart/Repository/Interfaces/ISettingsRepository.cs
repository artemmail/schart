using StockChart.Model;

namespace StockChart.Repository
{
    public interface ISettingsRepository
    {
        Task<ChartSettings> GetChartSettingsAsync(ApplicationUser? User, int Id);
        Task<List<ChartSettings>> GetChartSettingsForUserAsync(ApplicationUser? User);

        Task DeleteChartSettingsAsync(ApplicationUser User, ChartSettingsDTO DTO);
        Task<ChartSettings> CreateChartSettingsAsync(ApplicationUser User, ChartSettingsDTO DTO);
        Task SaveChartSettingsAsync(ApplicationUser User, int Id);

        Task<ChartSettings> GetDefaultSettingsAsync(ApplicationUser? User, string ticker);
    }
}