using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Services;
namespace StockChart.Pages
{
    public class PaymentModel : PageModel
    {        
        public NewsTableModel _newsTableModel;
        IBillingRepository billingRepository;
        public UserManager<ApplicationUser> UserManager;
        public SignInManager<ApplicationUser> SignInManager;

        public PaymentModel(ILogger<IndexModel> logger,
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,            
            IBillingRepository billingRepository)
        {
            this.billingRepository = billingRepository;
            this.UserManager = userManager;
            this.SignInManager = signInManager;
        }

        public DateTime Date;
        public PaymentShow UserInfo = null;
        public ApplicationUser Referal = null;
        public Guid? ProviderUserKey = null;
        public bool discount;
        public async Task OnGet(Guid? referal)
        {
            Referal = referal.HasValue ? UserManager.Users.Where(x => x.Id == referal.Value).Single() : null;
            ProviderUserKey = referal;

            if (SignInManager.IsSignedIn(User))
            {
                var user = this.User.Identity;
                var LoggedInUser = await UserManager.GetUserAsync(User);
                UserInfo = billingRepository.GetUserInfo2(LoggedInUser);
            }
        }
    }
}