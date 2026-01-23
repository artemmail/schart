using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StatementsController : ControllerBase
    {
        private readonly IFinancialStatementsService _service;

        public StatementsController(IFinancialStatementsService service)
        {
            _service = service;
        }

        [HttpGet("{ticker}")]
        public async Task<ActionResult<IReadOnlyList<FinancialStatementEntryDto>>> Get(
            string ticker,
            [FromQuery(Name = "standart")] string? standard,
            [FromQuery] string? period,
            [FromQuery] string? mode,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return BadRequest("Ticker is required.");
            }

            var result = await _service.GetStatementsAsync(
                ticker,
                standard ?? "MSFO",
                period ?? "y",
                mode ?? "raw",
                cancellationToken);

            return Ok(result);
        }
    }
}
