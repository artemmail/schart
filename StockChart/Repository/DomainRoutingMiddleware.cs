public class DomainRoutingMiddleware
{
    private readonly RequestDelegate _next;

    public DomainRoutingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var host = context.Request.Host.Host;
        context.Items["domain"] = host;

        await _next(context);
    }
}