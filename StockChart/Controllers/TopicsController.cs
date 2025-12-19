using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace StockChart.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TopicsController : ControllerBase
    {
        private readonly ITopicsRepository _topicsRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly StockProcContext _context;
        private readonly HttpClient _httpClient;

        public TopicsController(HttpClient httpClient, ITopicsRepository topicsRepository, UserManager<ApplicationUser> userManager, StockProcContext context)
        {
            _httpClient = httpClient;
            _topicsRepository = topicsRepository;
            _userManager = userManager;
            _context = context;
        }

        [HttpGet("page")]
        public async Task<IActionResult> GetTopicsPage(int page = 1, int pageSize = 10)
        {
            //   page = 1;
            //  pageSize = 10000;

            //    await _topicsRepository.PopulateSlugsAsync();

            if (page <= 0 || pageSize <= 0)
            {
                return BadRequest("Page and pageSize must be greater than 0.");
            }
            var totalItems = await _context.Topics.CountAsync();
            var topics = await _context.Topics
                .Where(x => x.Text != null && !x.Text.Contains("Sponsored"))
                .OrderByDescending(x => x.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(x => x.UserComments)
                .Include(x => x.User)
                .Select(x => new Line
                {
                    Id = x.Id,
                    Date = x.Date.ToShortDateString(),
                    CommentCount = x.UserComments.Count,
                    Header = x.Header,
                    Author = x.User.UserName,
                    Slug = x.Slug // Новое поле Slug
                })
                .ToListAsync();

            var result = new PaginatedResult<Line>
            {
                Items = topics,
                TotalCount = totalItems,
                Page = page,
                PageSize = pageSize
            };

            return Ok(result);
        }

        [HttpGet("topic")]
        public async Task<IActionResult> GetTopicsPageWIthData(int page = 1, int pageSize = 10)
        {
            //   page = 1;
            //  pageSize = 10000;

            //    await _topicsRepository.PopulateSlugsAsync();

            if (page <= 0 || pageSize <= 0)
            {
                return BadRequest("Page and pageSize must be greater than 0.");
            }
            var totalItems = await _context.Topics.CountAsync();
            var topics = await _context.Topics
                .Where(x => !x.Text.Contains("Sponsored"))
                .OrderByDescending(x => x.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Include(x => x.UserComments)
                .Include(x => x.User)
                .Select(x => new Topic
                {
                    Id = x.Id,
                    Date = x.Date,
                    CommentCount = x.UserComments.Count,
                    Header = x.Header,
                    Author = x.User.UserName,
                    Text = x.Text,
                    Slug = x.Slug // Новое поле Slug
                })

                .ToListAsync();

            var result = new PaginatedResult<Topic>
            {
                Items = topics,
                TotalCount = totalItems,
                Page = page,
                PageSize = pageSize
            };

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTopic(int id)
        {
            var topic = await _topicsRepository.GetTopicAsync(id);
            if (topic == null)
            {
                return NotFound();
            }

            var response = new
            {
                Id = topic.Id,
                Header = topic.Header,
                Text = topic.Text,
                Date = topic.Date,
                Slug = topic.Slug,
                TopicUser = new
                {
                    topic.User.Id,
                    topic.User.UserName
                },
                UserComments = topic.UserComments?.Select(comment => new
                {
                    comment.Id,
                    comment.Text,
                    comment.Date,
                    User = new
                    {
                        comment.User.Id,
                        comment.User.UserName
                    }
                }).ToList()
            };

            return Ok(response);
        }

        [HttpGet("slug/{slug}")]
        public async Task<IActionResult> GetTopicBySlug(string slug)
        {
            if (int.TryParse(slug, out var result))
            {
                // if(result <400)
                return await GetTopic(result);
            }

            var topic = await _topicsRepository.GetTopicBySlugAsync(slug);
            if (topic == null)
            {
                return NotFound();
            }

            var response = new
            {
                Id = topic.Id,
                Header = topic.Header,
                Text = topic.Text,
                Date = topic.Date,
                Slug = topic.Slug,
                TopicUser = new
                {
                    topic.User.Id,
                    topic.User.UserName
                },
                UserComments = topic.UserComments?.Select(comment => new
                {
                    comment.Id,
                    comment.Text,
                    comment.Date,
                    User = new
                    {
                        comment.User.Id,
                        comment.User.UserName
                    }
                }).ToList()
            };

            return Ok(response);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateTopic([FromBody] TopicModel model)
        {
            if (ModelState.IsValid && !string.IsNullOrWhiteSpace(model.Header) && !string.IsNullOrWhiteSpace(model.Text))
            {
                var loggedUser = await _userManager.GetUserAsync(User);
                var topic = await _topicsRepository.CreateTopicAsync(loggedUser, model.Header, model.Text);
                if (topic != null)
                {
                    await NotifyYandexAsync(topic.Slug);
                    return CreatedAtAction(nameof(GetTopicBySlug), new { slug = topic.Slug }, new { topic.Text, topic.Header, topic.Date, topic.Slug });
                }
            }

            return BadRequest();
        }




        [HttpGet("importFromExternal")]
        [Authorize]
        public async Task<IActionResult> ImportFromExternal(int page = 1, int pageSize = 3000)
        {
            // DTO для десериализации JSON
            var url = $"https://youscriptor.com/api/YSubtitiles/GetTasks?page={page}&pageSize={pageSize}";

            // Делаем запрос к внешнему сервису
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();

            // Параметры для JsonSerializer, если нужно игнорировать регистр полей
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            // Десериализуем
            var data = JsonSerializer.Deserialize<SubtitleTasksResponse>(json, options);
            if (data == null || data.Items == null)
            {
                return Ok("Нет данных для импорта");
            }

            // Получаем текущего пользователя
            var loggedUser = await _userManager.GetUserAsync(User);
            if (loggedUser == null)
            {
                return Unauthorized("Пользователь не найден.");
            }

            int importedCount = 0;

            // Перебираем элементы
            foreach (var item in data.Items.Where(x => x.Status == 900).OrderBy(x => x.CreatedAt))
            {
                // Проверка, есть ли уже тема с таким заголовком
                bool exists = await _context.Topics.AnyAsync(t => t.Header == item.Title);
                if (exists)
                {
                    // Если есть — пропускаем
                    continue;
                }

                // Проверяем, содержит ли заголовок кириллицу
                bool hasCyrillic = Regex.IsMatch(item.Title ?? string.Empty, "[а-яА-Я]");

                // В зависимости от наличия кириллицы формируем текст (русский/английский)

                // Загружаем полный текст с API
                string subtitleUrl = $"https://youscriptor.com/api/YSubtitiles/{item.Id}";
                var subtitleResponse = await _httpClient.GetAsync(subtitleUrl);
                subtitleResponse.EnsureSuccessStatusCode();
                var subtitleJson = await subtitleResponse.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(subtitleJson);
                var root = doc.RootElement;

                // Проверяем, есть ли поле "Result"
                string fullText = root.TryGetProperty("result", out var resultElement)
                    ? resultElement.GetString() ?? ""
                    : "";

                item.ResultShort = fullText;


                string text;
                string header = hasCyrillic
           ? "Текст распознан YouScriptor с канала"
           : "Recognized text from YouScriptor channel";

                string description = hasCyrillic
                    ? "распознано с видео на ютубе сервисом"
                    : "Recognized from a YouTube video by";

                string linkText = hasCyrillic
                    ? "читайте дальше по ссылке"
                    : "For more details, follow the link";

                text = $@"
{header} {item.ChannelName}

<br><br>

{description} <a href=""https://YouScriptor.com"">YouScriptor.com</a>, {linkText} 
<a href=""https://YouScriptor.com/recognized/{item.Slug}"">{item.Title}</a><br><br>

{item.ResultShort ?? ""}";


                // Создаём новую тему через репозиторий
                var createdTopic = await _topicsRepository.CreateTopicAsync(loggedUser, item.Title, text);
                if (createdTopic != null)
                {
                    importedCount++;

                    // При необходимости уведомим Яндекс
                    await NotifyYandexAsync(createdTopic.Slug);
                }
            }

            return Ok(new
            {
                Message = $"Импорт завершён. Добавлено новых тем: {importedCount}",
                TotalReceived = data.Items.Count,
                Imported = importedCount
            });
        }




        // Если нужно — добавьте эти классы внутри или отдельно
        public class SubtitleTasksResponse
        {
            [JsonPropertyName("items")]
            public List<SubtitleTask> Items { get; set; } = new();

            [JsonPropertyName("totalCount")]
            public int TotalCount { get; set; }
        }

        public class SubtitleTask
        {
            [JsonPropertyName("id")]
            public string Id { get; set; }

            [JsonPropertyName("channelId")]
            public string ChannelId { get; set; }

            [JsonPropertyName("channelName")]
            public string ChannelName { get; set; }

            [JsonPropertyName("title")]
            public string Title { get; set; }

            [JsonPropertyName("slug")]
            public string Slug { get; set; }

            [JsonPropertyName("createdAt")]
            public DateTime CreatedAt { get; set; }

            [JsonPropertyName("status")]
            public int Status { get; set; }

            [JsonPropertyName("done")]
            public bool Done { get; set; }

            [JsonPropertyName("resultShort")]
            public string ResultShort { get; set; }
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateTopic(int id, [FromBody] TopicModel model)
        {
            try
            {
                if (ModelState.IsValid && !string.IsNullOrWhiteSpace(model.Header) && !string.IsNullOrWhiteSpace(model.Text))
                {
                    var loggedUser = await _userManager.GetUserAsync(User);
                    var topic = await _topicsRepository.UpdateTopicAsync(loggedUser, id, model.Header, model.Text);
                    if (topic != null)
                    {
                        await NotifyYandexAsync(topic.Slug);
                        return Ok(new { topic.Text, topic.Header, topic.Date, topic.Slug });
                    }
                }
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }

            return BadRequest();
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteTopic(int id)
        {
            try
            {
                var loggedUser = await _userManager.GetUserAsync(User);
                await _topicsRepository.DeleteTopicAsync(loggedUser, id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
            return NoContent();
        }

        private async Task<bool> NotifyYandexAsync(string slug)
        {
            string baseUrl = "https://yandex.com/indexnow";
            string url = $"https://stockchart.ru/ServiceNews/Content/{slug}";
            string key = "f59e3d2c25e394fb";

            // Формируем полный URL с параметрами
            string fullUrl = $"{baseUrl}?url={url}&key={key}";

            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(fullUrl);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                using (StreamWriter sw = System.IO.File.AppendText("c:/log/yandex.txt"))
                {
                    sw.WriteLine(fullUrl);
                }
                // Обработка исключений при ошибке запроса
                return false;
            }
        }

        public class TopicModel
        {
            public string Header { get; set; }
            public string Text { get; set; }
        }

        public class Line
        {
            public int Id { get; set; }
            public string Date { get; set; }
            public int CommentCount { get; set; }
            public string Header { get; set; }
            public string Author { get; set; }
            public string Slug { get; set; } // Новое поле Slug
        }

        public class Topic
        {
            public int Id { get; set; }
            public DateTime Date { get; set; }
            public int CommentCount { get; set; }
            public string Header { get; set; }
            public string Author { get; set; }

            public string Text { get; set; }
            public string Slug { get; set; } // Новое поле Slug
        }


        public class PaginatedResult<T>
        {
            public IEnumerable<T> Items { get; set; }
            public int TotalCount { get; set; }
            public int Page { get; set; }
            public int PageSize { get; set; }
        }
    }
}
