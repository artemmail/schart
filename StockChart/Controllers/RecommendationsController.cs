using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationsController : ControllerBase
    {
        private readonly IShareholdersRecommendationsService _service;

        public RecommendationsController(IShareholdersRecommendationsService service)
        {
            _service = service;
        }

        [HttpGet("{ticker}")]
        public async Task<ActionResult<RecommendationDto>> Get(string ticker, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            var result = await _service.GetRecommendationsAsync(ticker, cancellationToken);
            return Ok(result);
        }
    }
}
