using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
namespace StockChart.Repository
{
    public class CommentsRepository : ICommentsRepository
    {
        private StockProcContext _dbContext;
        ITopicsRepository topicsRepository;
        IImageStoreRepository _imageStoreRepository;
        public CommentsRepository(StockProcContext dbContext,
             ITopicsRepository topicsRepository,
             IImageStoreRepository imageStoreRepository
            )
        {
            _imageStoreRepository = imageStoreRepository;
            this.topicsRepository = topicsRepository;
            _dbContext = dbContext;
        }
        public async Task<Comment> GetCommentAsync(int Id)
        {
            return await _dbContext.TopicComments.Include(x => x.User).Where(x => x.Id == Id).FirstOrDefaultAsync();
        }
        public async Task<Comment> UpdateCommentAsync(ApplicationUser User, int Id, string Text)
        {
            var t = await GetCommentAsync(Id);
            if (User.Id == t.UserId)
            {
                t.Text = await _imageStoreRepository.ConvertFromBlob(User, Text);
                t.Date = DateTime.Now;
                _dbContext.Update(t);
                _dbContext.SaveChanges();
                return t;
            }
            throw new Exception($"{User.UserName} правит коментарий {t.User.UserName}");
        }
        public async Task<Comment> CreateCommentAsync(ApplicationUser User, int TopicId, string Text)
        {
            var t = await topicsRepository.GetTopicAsync(TopicId);
            //if (User.Id == t.UserId)
            {
                Comment comment = new Comment()
                {
                    Date = DateTime.Now,
                    TopicId = TopicId,
                    Text = await _imageStoreRepository.ConvertFromBlob(User, Text),
                    UserId = User.Id
                };
                _dbContext.Add(comment);
                _dbContext.SaveChanges();
                return comment;
            }
            return null;
        }
        public async Task DeleteCommentAsync(ApplicationUser User, int Id)
        {
            var comment = await GetCommentAsync(Id);
            if (User.Id == comment.UserId)
            {
                _dbContext.Remove(comment);
                _dbContext.SaveChanges();
            }
            else
            {
                throw new Exception($"{User.UserName} удаляет коментарий {comment.User?.UserName}");
            }

        }
    }
}
