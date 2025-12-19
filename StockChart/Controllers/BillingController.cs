using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Model.Payments;
using StockChart.Repository.Services;


namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BillingController : ControllerBase
    {
        private readonly IBillingRepository _billingRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<BillingController> _logger;

        public BillingController(
            UserManager<ApplicationUser> userManager,
            ILogger<BillingController> logger,
            IBillingRepository billingRepository)
        {
            _userManager = userManager;
            _logger = logger;
            _billingRepository = billingRepository;
        }

        public class BillDto
        {
            public DateTime date { get; set; }
            public string? userName { get; set; }
            public decimal amount { get; set; }
            public int count { get; set; }
            public int services { get; set; }
        }


        [HttpGet("Bill/{id}")]
        [Admin]
        public IActionResult GetBill(Guid id)
        {
            try
            {
                var b = _billingRepository.getBill(id);

                _billingRepository.ApplyPayment(b);

                if (b == null)
                {
                    return NotFound("Bill not found.");
                }

                

                var dto = new BillDto
                {
                    date = b.Date,
                    userName = b.User?.UserName,
                    amount = b.Amount,
                    count = b.Count,
                    services = b.Services                    
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetBill(Guid id)");
                return StatusCode(500, "Internal server error");
            }
        }


        [HttpPost("Yandex")]
        public IActionResult Yandex([FromForm] YandexIncome income)
        {
            try
            {
                _logger.LogInformation("Received YandexIncome: {Income}", income);
                _billingRepository.recievePayment(income.label);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Yandex payment.");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("Tarifs")]
        public async Task<IActionResult> Tarifs(int service = 1, Guid? guid = null)
        {
            ApplicationUser user = null;
            if (User.Identity?.IsAuthenticated == true)
            {
                user = await _userManager.GetUserAsync(User);
            }

            var subscriptions = _billingRepository.getRefealSubscriptions(user, guid)
                .Where(x => x.code == service)
                .ToArray();

            return Ok(subscriptions);
        }
    }
}
