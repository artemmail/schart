using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShareholdersController : ControllerBase
    {
        private readonly IShareholdersRecommendationsService _service;

        public ShareholdersController(IShareholdersRecommendationsService service)
        {
            _service = service;
        }

        [HttpGet("{ticker}")]
        public async Task<ActionResult<ShareholdersStructureDto>> Get(string ticker, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            var result = await _service.GetShareholdersAsync(ticker, cancellationToken);
            return Ok(result);
        }
    }
}
