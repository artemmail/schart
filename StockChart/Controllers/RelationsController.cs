using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/relations")]
    public sealed class RelationsController : ControllerBase
    {
        private readonly IInstrumentRelationsService _service;

        public RelationsController(IInstrumentRelationsService service)
        {
            _service = service;
        }

        [HttpGet("{stockSecId}")]
        public async Task<ActionResult<InstrumentRelationsDto>> GetRelations(string stockSecId, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(stockSecId))
            {
                return BadRequest("stockSecId is required.");
            }

            var result = await _service.GetRelationsAsync(stockSecId, cancellationToken);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }
    }
}
