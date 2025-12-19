using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Mvc.Filters;
public class AdminFilter : IAsyncPageFilter, IOrderedFilter
{
    private readonly IAuthorizationPolicyProvider policyProvider;
    private readonly IPolicyEvaluator policyEvaluator;
    public AdminFilter(
        IAuthorizationPolicyProvider policyProvider,
        IPolicyEvaluator policyEvaluator)
    {
        this.policyProvider = policyProvider;
        this.policyEvaluator = policyEvaluator;
    }
    // Run late in the selection pipeline
    public int Order => 10000;
    public Task OnPageHandlerExecutionAsync(PageHandlerExecutingContext context, PageHandlerExecutionDelegate next) => next();
    public async Task OnPageHandlerSelectionAsync(PageHandlerSelectedContext context)
    {
        var name = context.HttpContext.User?.Identity?.Name;
        if (name != "ruticker")
        {
            await context.HttpContext.ForbidAsync();
        }
    }
}