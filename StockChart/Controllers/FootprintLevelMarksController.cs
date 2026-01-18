using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FootprintLevelMarksController : ControllerBase
    {
        private readonly IFootprintLevelMarksRepository _marksRepository;
        private readonly ITickersRepository _tickersRepository;
        private readonly IStockMarketServiceRepository _stockMarketService;
        private readonly UserManager<ApplicationUser> _userManager;

        public FootprintLevelMarksController(
            IFootprintLevelMarksRepository marksRepository,
            ITickersRepository tickersRepository,
            IStockMarketServiceRepository stockMarketService,
            UserManager<ApplicationUser> userManager)
        {
            _marksRepository = marksRepository;
            _tickersRepository = tickersRepository;
            _stockMarketService = stockMarketService;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<ActionResult<List<FootprintLevelMarkDto>>> Get([FromQuery] string? ticker)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            _stockMarketService.UpdateAlias(ref ticker);
            if (!_tickersRepository.Tickers.TryGetValue(ticker, out var dictionary))
            {
                return NotFound("Ticker not found.");
            }

            var marks = await _marksRepository.GetMarksAsync(user.Id, dictionary.Id);
            var result = marks.Select(ToDto).ToList();
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<FootprintLevelMarkDto>> Upsert([FromBody] FootprintLevelMarkUpsertRequest request)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var ticker = request.Ticker?.Trim();
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            if (request.Price == null)
            {
                return BadRequest("Price is required.");
            }

            _stockMarketService.UpdateAlias(ref ticker);
            if (!_tickersRepository.Tickers.TryGetValue(ticker, out var dictionary))
            {
                return NotFound("Ticker not found.");
            }

            var color = string.IsNullOrWhiteSpace(request.Color) ? "#F0E68C" : request.Color.Trim();
            var comment = request.Comment?.Trim() ?? string.Empty;

            var mark = await _marksRepository.UpsertMarkAsync(user.Id, dictionary.Id, request.Price.Value, color, comment);
            return Ok(ToDto(mark));
        }

        [HttpDelete]
        public async Task<IActionResult> Delete([FromQuery] string? ticker, [FromQuery] decimal? price)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            if (price == null)
            {
                return BadRequest("Price is required.");
            }

            _stockMarketService.UpdateAlias(ref ticker);
            if (!_tickersRepository.Tickers.TryGetValue(ticker, out var dictionary))
            {
                return NotFound("Ticker not found.");
            }

            var deleted = await _marksRepository.DeleteMarkAsync(user.Id, dictionary.Id, price.Value);
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpDelete("ticker")]
        public async Task<IActionResult> DeleteForTicker([FromQuery] string? ticker)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            _stockMarketService.UpdateAlias(ref ticker);
            if (!_tickersRepository.Tickers.TryGetValue(ticker, out var dictionary))
            {
                return NotFound("Ticker not found.");
            }

            await _marksRepository.DeleteMarksForTickerAsync(user.Id, dictionary.Id);
            return NoContent();
        }

        private static FootprintLevelMarkDto ToDto(FootprintLevelMark mark)
        {
            return new FootprintLevelMarkDto
            {
                Price = mark.Price,
                Color = mark.Color,
                Comment = mark.Comment ?? string.Empty,
            };
        }
    }

    public class FootprintLevelMarkDto
    {
        [JsonPropertyName("price")]
        public decimal Price { get; set; }

        [JsonPropertyName("color")]
        public string Color { get; set; } = string.Empty;

        [JsonPropertyName("comment")]
        public string Comment { get; set; } = string.Empty;
    }

    public class FootprintLevelMarkUpsertRequest
    {
        [JsonPropertyName("ticker")]
        public string? Ticker { get; set; }

        [JsonPropertyName("price")]
        public decimal? Price { get; set; }

        [JsonPropertyName("color")]
        public string? Color { get; set; }

        [JsonPropertyName("comment")]
        public string? Comment { get; set; }
    }
}
