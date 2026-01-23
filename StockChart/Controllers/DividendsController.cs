using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DividendsController : ControllerBase
    {
        private readonly IDividendsMoexService _dividendsService;

        public DividendsController(IDividendsMoexService dividendsService)
        {
            _dividendsService = dividendsService;
        }

        [HttpGet("{ticker}")]
        public async Task<ActionResult<DividendsResponse>> Get(string ticker, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            var result = await _dividendsService.GetDividendsAsync(ticker, cancellationToken);
            return Ok(result);
        }
    }
}
