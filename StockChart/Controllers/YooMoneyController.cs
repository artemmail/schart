using Microsoft.AspNetCore.Mvc;
using StockChart.Repository.Services;
using Yoomoney.model;

namespace StockChart.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class YooMoneyController : ControllerBase
    {
        private readonly IYooMoneyRepository _yooMoneyRepository;

        public YooMoneyController(IYooMoneyRepository yooMoneyRepository)
        {
            _yooMoneyRepository = yooMoneyRepository;
        }

        [Admin]

        [HttpGet("operation-details/{operationId}")]
        public IActionResult GetOperationDetails(string operationId)
        {
            var details = _yooMoneyRepository.operationDetails(operationId);
            if (details == null)
                return NotFound("Operation details not found.");

            return Ok(details);
        }

        [Admin]
        [HttpGet("operation-history")]
        public IActionResult GetOperationHistory([FromQuery] int from, [FromQuery] int count)
        {
            var history = _yooMoneyRepository.operationHistory(from, count);
            if (history == null || !history.Any())
                return NotFound("Operation history not found.");

            return Ok(history);
        }
        
    }
}
