using Microsoft.AspNetCore.Identity;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using System.Security.Claims;

namespace StockChart.Repository.Services
{

    public class RoleAssignmentService : IRoleAssignmentService
    {
        private readonly IUsersRepository _subscriptionService;
        private readonly UserManager<ApplicationUser> _userManager;

        public RoleAssignmentService(IUsersRepository subscriptionService, UserManager<ApplicationUser> userManager)
        {
            _subscriptionService = subscriptionService;
            _userManager = userManager;
        }

        public async Task AssignRolesAsync(ClaimsIdentity identity, ApplicationUser user)
        {
            // Логика для проверки подписки
            bool hasSubscription = await _subscriptionService.UserHasActiveSubscription(user);
            if (hasSubscription)
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, "SubscribedUser"));
            }
            else
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, "NonSubscribedUser"));
            }
            if(user.UserName=="ruticker")
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, "Admin"));
            }

            /*

            // Логика для роли администратора
            if (await _userManager.IsInRoleAsync(user, "Admin"))
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, "Admin"));
            }
            */
        }
    }
    
}
