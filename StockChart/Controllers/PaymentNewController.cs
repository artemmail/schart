using Microsoft.AspNetCore.Mvc;
using StockChart.Model.Payments;
using StockChart.Repository;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsNewController : ControllerBase
    {
        private readonly IPaymentsRepository _paymentsRepository;

        public PaymentsNewController(IPaymentsRepository paymentsRepository)
        {
            _paymentsRepository = paymentsRepository;
        }

        [HttpGet("Read")]
        public IActionResult Read()
        {
            var payments = _paymentsRepository
                .GetAll()
                .Select(p => _paymentsRepository.PaymentToModel(p))
                .ToList();

            return Ok(payments);
        }

        [HttpPost("Create")]
        public IActionResult Create([FromBody] IEnumerable<PaymentModel> models)
        {
            var res = _paymentsRepository.Create(models)
                .Select(p => _paymentsRepository.PaymentToModel(p))
                .ToList();

            return Ok(res);
        }

        [HttpPost("Update")]
        public IActionResult Update([FromBody] IEnumerable<PaymentModel> models)
        {
            var res = _paymentsRepository.Update(models)
                .Select(p => _paymentsRepository.PaymentToModel(p))
                .ToList();

            return Ok(res);
        }

        [HttpPost("Destroy")]
        public IActionResult Destroy([FromBody] IEnumerable<PaymentModel> models)
        {
            _paymentsRepository.Destroy(models);
            return NoContent();
        }
    }
}
