using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IShareholdersRecommendationsService
    {
        Task<ShareholdersStructureDto> GetShareholdersAsync(string ticker, CancellationToken cancellationToken = default);
        Task<RecommendationDto> GetRecommendationsAsync(string ticker, CancellationToken cancellationToken = default);
        Task<int> ImportFromFolderAsync(string folderPath, CancellationToken cancellationToken = default);
    }
}
