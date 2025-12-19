using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Services;

[Route("api/[controller]")]
[ApiController]
public class PaymentController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IBillingRepository _billingRepository;

    public PaymentController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IBillingRepository billingRepository)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _billingRepository = billingRepository;
    }

    [HttpGet("{referal?}")]
    public async Task<IActionResult> GetPaymentInfo(Guid? referal)
    {
        ApplicationUser referalUser = referal.HasValue ? _userManager.Users.SingleOrDefault(x => x.Id == referal.Value) : null;

        if (_signInManager.IsSignedIn(User))
        {
            var LoggedInUser = await _userManager.GetUserAsync(User);
            var userInfo = _billingRepository.GetUserInfo2(LoggedInUser);
            var result = new
            {
                UserInfo = userInfo,
                Referal = referalUser
            };
            return Ok(result);
        }

        return Unauthorized();
    }
}