using System.Collections.Generic;
using System.Threading.Tasks;
using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface ITopicsRepository
    {
        Task<Topic> GetTopicAsync(int id);
        Task<Topic> GetTopicBySlugAsync(string slug);
        Task<Topic> UpdateTopicAsync(ApplicationUser user, int id, string header, string text);
        Task DeleteTopicAsync(ApplicationUser user, int id);
        Task<Topic> CreateTopicAsync(ApplicationUser user, string header, string text);

        Task PopulateSlugsAsync();
    }
}
