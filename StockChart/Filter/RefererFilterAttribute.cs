using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public class RefererFilterAttribute : ActionFilterAttribute
{
    public string[] ValidReferers { get; set; } = new[] { "ru-ticker", "stockchart", "stock-charts", "localhost:5253", "localhost" };

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.HttpContext.Request.Headers.TryGetValue("Referer", out var referer))
        {
            if (ValidReferers.Any(validReferer => referer.ToString().Contains(validReferer)))
            {
                base.OnActionExecuting(context);
            }
            else
            {
                context.Result = new StatusCodeResult(403);
            }
        }
        else
        {
            context.Result = new StatusCodeResult(403);
            //base.OnActionExecuting(context);
        }
    }
}