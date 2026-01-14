using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FootprintFavoritesController : ControllerBase
    {
        private readonly IFootprintFavoritesRepository _favoritesRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        public FootprintFavoritesController(
            IFootprintFavoritesRepository favoritesRepository,
            UserManager<ApplicationUser> userManager)
        {
            _favoritesRepository = favoritesRepository;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<ActionResult<List<FootprintFavoriteDto>>> GetFavorites()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var favorites = await _favoritesRepository.GetFavoritesAsync(user.Id);
            var result = favorites.Select(ToDto).ToList();
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<FootprintFavoriteDto>> CreateFavorite(
            [FromBody] FootprintFavoriteCreateRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var name = request.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest("Name is required.");
            }

            if (request.Params.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            {
                return BadRequest("Params are required.");
            }

            Guid? favoriteId = null;
            if (!string.IsNullOrWhiteSpace(request.Id) && Guid.TryParse(request.Id, out var parsedId))
            {
                favoriteId = parsedId;
            }

            var favorite = await _favoritesRepository.CreateFavoriteAsync(
                user.Id,
                name,
                request.Params.GetRawText(),
                request.PresetIndex,
                favoriteId);

            return Ok(ToDto(favorite));
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<FootprintFavoriteDto>> RenameFavorite(
            Guid id,
            [FromBody] FootprintFavoriteRenameRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var name = request.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest("Name is required.");
            }

            var favorite = await _favoritesRepository.RenameFavoriteAsync(user.Id, id, name);
            if (favorite == null)
            {
                return NotFound();
            }

            return Ok(ToDto(favorite));
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteFavorite(Guid id)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var deleted = await _favoritesRepository.DeleteFavoriteAsync(user.Id, id);
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }

        private static FootprintFavoriteDto ToDto(FootprintFavorite favorite)
        {
            var paramsJson = string.IsNullOrWhiteSpace(favorite.ParamsJson)
                ? "{}"
                : favorite.ParamsJson;

            var paramsElement = ParseParams(paramsJson);

            return new FootprintFavoriteDto
            {
                Id = favorite.Id.ToString(),
                Name = favorite.Name,
                Params = paramsElement,
                PresetIndex = favorite.PresetIndex,
            };
        }

        private static JsonElement ParseParams(string paramsJson)
        {
            try
            {
                return JsonSerializer.Deserialize<JsonElement>(paramsJson);
            }
            catch (JsonException)
            {
                return JsonSerializer.Deserialize<JsonElement>("{}");
            }
        }
    }

    public class FootprintFavoriteDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("params")]
        public JsonElement Params { get; set; }

        [JsonPropertyName("presetIndex")]
        public int? PresetIndex { get; set; }
    }

    public class FootprintFavoriteCreateRequest
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("params")]
        public JsonElement Params { get; set; }

        [JsonPropertyName("presetIndex")]
        public int? PresetIndex { get; set; }
    }

    public class FootprintFavoriteRenameRequest
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }
}
