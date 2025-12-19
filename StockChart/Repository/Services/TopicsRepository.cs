using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using System.Text.RegularExpressions;
using System.Linq;
using System.Text;

namespace StockChart.Repository
{
    public class TopicsRepository : ITopicsRepository
    {
        private readonly StockProcContext _dbContext;
        private readonly IImageStoreRepository _imageStoreRepository;

        public TopicsRepository(StockProcContext dbContext, IImageStoreRepository imageStoreRepository)
        {
            _dbContext = dbContext;
            _imageStoreRepository = imageStoreRepository;
        }

        public async Task PopulateSlugsAsync()
        {
            var existingSlugs = _dbContext.Topics.Select(t => t.Slug).ToList();
            var topicsWithoutSlug = await _dbContext.Topics
                .Where(x => string.IsNullOrEmpty(x.Slug))
                .ToListAsync();

            foreach (var topic in topicsWithoutSlug)
            {
                topic.Slug = GenerateSlug(topic.Header, existingSlugs);
                _dbContext.Update(topic);
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task<Topic> GetTopicAsync(int id)
        {
            return await _dbContext.Topics
                .Where(x => x.Id == id)
                .Include(x => x.User)
                .Include(x => x.UserComments)
                .ThenInclude(x => x.User)
                .AsNoTracking()
                .FirstOrDefaultAsync();
        }

        public async Task<Topic> GetTopicBySlugAsync(string slug)
        {
            return await _dbContext.Topics
                .Where(x => x.Slug == slug)
                .Include(x => x.User)
                .Include(x => x.UserComments)
                .ThenInclude(x => x.User)
                .AsNoTracking()
                .FirstOrDefaultAsync();
        }

        public async Task<Topic> UpdateTopicAsync(ApplicationUser user, int id, string header, string text)
        {
            var topic = await _dbContext.Topics
                .Where(x => x.Id == id && x.UserId == user.Id)
                .FirstOrDefaultAsync();

            if (topic != null)
            {
                topic.Text = await _imageStoreRepository.ConvertFromBlob(user, text);
                topic.Header = header;
             

            
            
            

                _dbContext.Update(topic);
                await _dbContext.SaveChangesAsync();
                return topic;
            }

            return null;
        }

        public async Task DeleteTopicAsync(ApplicationUser user, int id)
        {
            var topic = await _dbContext.Topics
                .Where(x => x.Id == id && x.UserId == user.Id)
                .FirstOrDefaultAsync();

            if (topic == null)
            {
                throw new Exception($"Не удалось найти topic с id = {id}");
            }

            var hasComments = await _dbContext.TopicComments.AnyAsync(x => x.TopicId == topic.Id);

            if (hasComments)
            {
                throw new Exception("Не удалось удалить topic, так как есть комментарии");
            }

            if (user.Id == topic.UserId)
            {
                _dbContext.Remove(topic);
                await _dbContext.SaveChangesAsync();
            }
            else
            {
                throw new Exception("Не удалось удалить topic - у пользователя нет прав");
            }
        }

        public async Task<Topic> CreateTopicAsync(ApplicationUser user, string header, string text)
        {
            var existingSlugs = _dbContext.Topics.Select(t => t.Slug).ToList();
            var slug = GenerateSlug(header, existingSlugs);

            var topic = new Topic
            {
                Date = DateTime.Now,
                Header = header,
                Text = await _imageStoreRepository.ConvertFromBlob(user, text),
                UserId = user.Id,
                Slug = slug
            };

            _dbContext.Add(topic);
            await _dbContext.SaveChangesAsync();
            return topic;
        }

        private string GenerateSlug(string header, IEnumerable<string> existingSlugs)
        {
            string transliterated = Transliterate(header);
            string slug = Regex.Replace(transliterated, @"[^a-zA-Z0-9\-]", "-").ToLower();

            string uniqueSlug = slug;
            int counter = 1;
            while (existingSlugs.Contains(uniqueSlug))
            {
                uniqueSlug = $"{slug}-{counter}";
                counter++;
            }

            return uniqueSlug;
        }

        private string Transliterate(string text)
        {
            text = text.Trim();

            Dictionary<char, string> translitMap = new Dictionary<char, string>
            {
                {'а', "a"}, {'б', "b"}, {'в', "v"}, {'г', "g"}, {'д', "d"},
                {'е', "e"}, {'ё', "yo"}, {'ж', "zh"}, {'з', "z"}, {'и', "i"},
                {'й', "y"}, {'к', "k"}, {'л', "l"}, {'м', "m"}, {'н', "n"},
                {'о', "o"}, {'п', "p"}, {'р', "r"}, {'с', "s"}, {'т', "t"},
                {'у', "u"}, {'ф', "f"}, {'х', "kh"}, {'ц', "ts"}, {'ч', "ch"},
                {'ш', "sh"}, {'щ', "sch"}, {'ъ', ""}, {'ы', "y"}, {'ь', ""},
                {'э', "e"}, {'ю', "yu"}, {'я', "ya"}
            };

            var result = new StringBuilder();
            foreach (var c in text.ToLower())
            {
                if (translitMap.ContainsKey(c))
                {
                    result.Append(translitMap[c]);
                }
                else
                {
                    result.Append(c);
                }
            }

            return result.ToString();
        }
    }
}
