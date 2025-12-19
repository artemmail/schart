using Microsoft.EntityFrameworkCore;
using StockChart.Model;
namespace StockChart.Repository
{
    public interface ICommentsRepository
    {
        public Task<Comment> GetCommentAsync(int Id);
        public Task<Comment> UpdateCommentAsync(ApplicationUser User, int Id, string Text);
        public Task<Comment> CreateCommentAsync(ApplicationUser User, int TopicId, string Text);
        public Task DeleteCommentAsync(ApplicationUser User, int Id);
    }
}