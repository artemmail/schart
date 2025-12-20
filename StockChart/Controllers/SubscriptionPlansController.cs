using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using StockChart.Model;
using System.ComponentModel.DataAnnotations;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SubscriptionPlansController : ControllerBase
    {
        private readonly StockProcContext _dbContext;
        private readonly ILogger<SubscriptionPlansController> _logger;

        public SubscriptionPlansController(
            StockProcContext dbContext,
            ILogger<SubscriptionPlansController> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        [HttpGet]
        [Admin]
        public async Task<ActionResult<SubscriptionPlanResponse>> GetAsync()
        {
            var plans = await _dbContext.SubscriptionPlans
                .AsNoTracking()
                .OrderBy(plan => plan.Id)
                .ToListAsync();

            var discount = await _dbContext.TaxSettings
                .AsNoTracking()
                .Select(x => x.DiscountBefore)
                .FirstOrDefaultAsync();

            var response = new SubscriptionPlanResponse
            {
                DiscountBefore = discount == default ? DateTime.UtcNow : discount,
                Plans = plans.Select(Map).ToList()
            };

            return Ok(response);
        }

        [HttpPost]
        [Admin]
        public async Task<ActionResult<SubscriptionPlanDto>> CreateAsync([FromBody] SubscriptionPlanRequest request)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var plan = new SubscriptionPlan
            {
                Interval = request.Interval,
                Count = request.Count,
                OrdinalMoney = request.OrdinalMoney,
                DiscountMoney = request.DiscountMoney,
                Code = request.Code,
                IsReferal = request.IsReferal,
                ReferalInterval = request.ReferalInterval,
                ReferalCount = request.ReferalCount
            };

            _dbContext.SubscriptionPlans.Add(plan);
            await _dbContext.SaveChangesAsync();

            return Ok(Map(plan));
        }

        [HttpPut("{id:int}")]
        [Admin]
        public async Task<ActionResult<SubscriptionPlanDto>> UpdateAsync(int id, [FromBody] SubscriptionPlanRequest request)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var plan = await _dbContext.SubscriptionPlans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            plan.Interval = request.Interval;
            plan.Count = request.Count;
            plan.OrdinalMoney = request.OrdinalMoney;
            plan.DiscountMoney = request.DiscountMoney;
            plan.Code = request.Code;
            plan.IsReferal = request.IsReferal;
            plan.ReferalInterval = request.ReferalInterval;
            plan.ReferalCount = request.ReferalCount;

            await _dbContext.SaveChangesAsync();

            return Ok(Map(plan));
        }

        [HttpDelete("{id:int}")]
        [Admin]
        public async Task<IActionResult> DeleteAsync(int id)
        {
            var plan = await _dbContext.SubscriptionPlans.FindAsync(id);
            if (plan == null)
            {
                return NotFound();
            }

            _dbContext.SubscriptionPlans.Remove(plan);
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("discount")]
        [Admin]
        public async Task<ActionResult<DiscountSettingDto>> UpdateDiscountAsync([FromBody] DiscountSettingDto request)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            try
            {
                var settings = await _dbContext.TaxSettings.FirstOrDefaultAsync();
                if (settings == null)
                {
                    settings = new TaxSetting();
                    _dbContext.TaxSettings.Add(settings);
                }

                settings.DiscountBefore = request.DiscountBefore;
                await _dbContext.SaveChangesAsync();

                return Ok(new DiscountSettingDto { DiscountBefore = settings.DiscountBefore });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update discount period");
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to update discount period");
            }
        }

        private static SubscriptionPlanDto Map(SubscriptionPlan plan) => new()
        {
            Id = plan.Id,
            Interval = plan.Interval,
            Count = plan.Count,
            OrdinalMoney = plan.OrdinalMoney,
            DiscountMoney = plan.DiscountMoney,
            Code = plan.Code,
            IsReferal = plan.IsReferal,
            ReferalInterval = plan.ReferalInterval,
            ReferalCount = plan.ReferalCount
        };
    }

    public class SubscriptionPlanRequest
    {
        [Required]
        [StringLength(8)]
        public string Interval { get; set; } = "m";

        [Range(1, int.MaxValue)]
        public int Count { get; set; }

        [Range(0, double.MaxValue)]
        public decimal OrdinalMoney { get; set; }

        [Range(0, double.MaxValue)]
        public decimal DiscountMoney { get; set; }

        public int Code { get; set; }

        public bool IsReferal { get; set; }

        [StringLength(8)]
        public string? ReferalInterval { get; set; }

        [Range(0, int.MaxValue)]
        public int? ReferalCount { get; set; }
    }

    public class SubscriptionPlanDto : SubscriptionPlanRequest
    {
        public int Id { get; set; }
    }

    public class SubscriptionPlanResponse
    {
        public DateTime DiscountBefore { get; set; }
        public List<SubscriptionPlanDto> Plans { get; set; } = new();
    }

    public class DiscountSettingDto
    {
        [Required]
        public DateTime DiscountBefore { get; set; }
    }
}
