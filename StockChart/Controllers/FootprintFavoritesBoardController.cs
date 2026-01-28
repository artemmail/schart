using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FootprintFavoritesBoardController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;

        public FootprintFavoritesBoardController(ApplicationDbContext dbContext, UserManager<ApplicationUser> userManager)
        {
            _dbContext = dbContext;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<ActionResult<FootprintFavoritesBoardDto>> Get()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var board = await _dbContext.FootprintFavoritesBoards
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.UserId == user.Id);

            var configJson = string.IsNullOrWhiteSpace(board?.ConfigJson)
                ? "{}"
                : board.ConfigJson;

            return Ok(new FootprintFavoritesBoardDto
            {
                Config = ParseConfig(configJson)
            });
        }

        [HttpPut]
        public async Task<IActionResult> Put([FromBody] FootprintFavoritesBoardUpdateRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            if (request.Config.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            {
                return BadRequest("Config is required.");
            }

            var configJson = request.Config.GetRawText();
            var board = await _dbContext.FootprintFavoritesBoards
                .FirstOrDefaultAsync(item => item.UserId == user.Id);

            if (board == null)
            {
                board = new FootprintFavoritesBoard
                {
                    UserId = user.Id,
                    User = user,
                    ConfigJson = configJson,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.FootprintFavoritesBoards.Add(board);
            }
            else
            {
                board.UserId = user.Id;
                board.User = user;
                board.ConfigJson = configJson;
                board.UpdatedAt = DateTime.UtcNow;
                _dbContext.FootprintFavoritesBoards.Update(board);
            }

            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        private static JsonElement ParseConfig(string configJson)
        {
            try
            {
                return JsonSerializer.Deserialize<JsonElement>(configJson);
            }
            catch (JsonException)
            {
                return JsonSerializer.Deserialize<JsonElement>("{}");
            }
        }
    }

    public class FootprintFavoritesBoardDto
    {
        [JsonPropertyName("config")]
        public JsonElement Config { get; set; }
    }

    public class FootprintFavoritesBoardUpdateRequest
    {
        [JsonPropertyName("config")]
        public JsonElement Config { get; set; }
    }
}
