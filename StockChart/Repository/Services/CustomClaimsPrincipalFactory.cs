using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using StockChart.Model;
using System.Security.Claims;

public class CustomClaimsPrincipalFactory : UserClaimsPrincipalFactory<ApplicationUser, ApplicationRole>
{
    public CustomClaimsPrincipalFactory(
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        IOptions<IdentityOptions> optionsAccessor)
        : base(userManager, roleManager, optionsAccessor)
    {
    }

    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);

        // Добавьте свои пользовательские клеймы или роли
        // if (/* условие для добавления роли */)
        {
            identity.AddClaim(new Claim(ClaimTypes.Role, "SubscribedUser"));
        }

        return identity;
    }
}
