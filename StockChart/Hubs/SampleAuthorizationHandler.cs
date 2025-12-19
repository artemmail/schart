using Microsoft.AspNetCore.Authorization;

namespace StockChart.Hubs
{
    public class SampleRequirement : IAuthorizationRequirement
    {

    }
    public class SampleAuthorizationHandler : AuthorizationHandler<SampleRequirement>
    {
        private readonly ILogger _logger;

        public SampleAuthorizationHandler()
        {

        }

        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context, SampleRequirement requirement)
        {
            //  _logger.LogInformation("Inside my handler");

            // ...

            return Task.CompletedTask;
        }
    }
}
