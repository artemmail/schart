using Microsoft.AspNetCore.Mvc;
using StockChart.Repository;
using Kendo.Mvc.Extensions;
using Kendo.Mvc.UI;
using StockChart.Model.Payments;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Collections.Generic;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : Controller
    {
        private readonly IPaymentsRepository _paymentsRepository;

        public PaymentsController(IPaymentsRepository paymentsRepository)
        {
            _paymentsRepository = paymentsRepository;
        }

        // Existing methods for Kendo UI Grid
        [HttpPost]
        [Route("Update")]
        [Admin]
        public DataSourceResult Update([DataSourceRequest] DataSourceRequest request, [FromForm][Bind(Prefix = "models")] IEnumerable<PaymentModel> models)
        {
            var res = _paymentsRepository.Update(models).Select(p => _paymentsRepository.PaymentToModel(p)).ToList();
            return res.ToDataSourceResult(request, ModelState);
        }

        [HttpPost]
        [Route("Create")]
        [Admin]
        public DataSourceResult Create([DataSourceRequest] DataSourceRequest request, [FromForm][Bind(Prefix = "models")] IEnumerable<PaymentModel> models)
        {
            var res = _paymentsRepository.Create(models).Select(p => _paymentsRepository.PaymentToModel(p)).ToList();
            return res.ToDataSourceResult(request, ModelState);
        }

        [HttpPost]
        [Route("Destroy")]
        [Admin]
        public void Destroy([DataSourceRequest] DataSourceRequest request, [FromForm][Bind(Prefix = "models")] IEnumerable<PaymentModel> models)
        {
            _paymentsRepository.Destroy(models);
        }

        [HttpPost("Read")]
        [Admin]
        public DataSourceResult Read([DataSourceRequest] DataSourceRequest requestModel)
        {
            var x = _paymentsRepository
                .GetAll()
                .Select(p => _paymentsRepository.PaymentToModel(p));
            return x.ToDataSourceResult(requestModel);
        }

        [HttpGet("GetPayments")]
        [Admin]
        public IActionResult GetPayments(
     [FromQuery] int page = 1,
     [FromQuery] int pageSize = 20,
     [FromQuery] string sortField = null,
     [FromQuery] string sortOrder = null,
     [FromQuery] string filter = null)
        {
            var query = _paymentsRepository.GetAll();

            // Применяем фильтрацию
            if (!string.IsNullOrEmpty(filter))
            {
                query = query.Where(p =>
                    p.User.UserName.Contains(filter) ||
                    p.User.Email.Contains(filter));
            }

            // Применяем сортировку
            if (!string.IsNullOrEmpty(sortField))
            {
                // Корректируем поле сортировки для связанных свойств
                if (sortField == "UserName" || sortField == "Email")
                {
                    sortField = $"User.{sortField}";
                }
                var sortExpression = $"{sortField} {(sortOrder == "desc" ? "descending" : "ascending")}";
                query = query.OrderBy(sortExpression);
            }

            var totalItems = query.Count();

            // Применяем пагинацию
            var items = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            var result = new
            {
                items = items.Select(p => _paymentsRepository.PaymentToModel(p)),
                totalCount = totalItems
            };

            return Ok(result);
        }

        [HttpPost("CreatePayments")]
        [Admin]
        public IActionResult CreatePayments([FromBody] IEnumerable<PaymentModel> models)
        {
            if (ModelState.IsValid)
            {
                var payments = _paymentsRepository.Create(models);
                var paymentModels = payments.Select(p => _paymentsRepository.PaymentToModel(p));
                return Ok(paymentModels);
            }
            return BadRequest(ModelState);
        }

        [HttpPut("UpdatePayments")]
        [Admin]
        public IActionResult UpdatePayments([FromBody] IEnumerable<PaymentModel> models)
        {
            if (ModelState.IsValid)
            {
                var payments = _paymentsRepository.Update(models);
                var paymentModels = payments.Select(p => _paymentsRepository.PaymentToModel(p));
                return Ok(paymentModels);
            }
            return BadRequest(ModelState);
        }

        [HttpDelete("DeletePayments")]
        [Admin]
        public IActionResult DeletePayments([FromBody] IEnumerable<PaymentModel> models)
        {
            _paymentsRepository.Destroy(models);
            return NoContent();
        }
    }
}
