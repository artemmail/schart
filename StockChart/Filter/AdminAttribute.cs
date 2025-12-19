using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

#region Base Attribute for User Name Authorization
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public abstract class UserNameAuthorizeAttribute : Attribute, IAuthorizationFilter
{
    /// <summary>
    /// Gets the collection of allowed user names.
    /// </summary>
    protected abstract IEnumerable<string> AllowedUserNames { get; }

    /// <summary>
    /// Checks if the current user's name is in the allowed list.
    /// </summary>
    public virtual void OnAuthorization(AuthorizationFilterContext context)
    {
        var userName = context.HttpContext.User?.Identity?.Name?.ToLower();

        if (!AllowedUserNames.Contains(userName))
        {
            File.AppendAllText("c:/log/try_auth1.txt", userName + " " + Environment.NewLine);
            context.Result = new ForbidResult();
        }
    }
}
#endregion

#region Admin Attribute
/// <summary>
/// Authorizes access only to the user "ruticker".
/// </summary>
public class AdminAttribute : UserNameAuthorizeAttribute
{
    protected override IEnumerable<string> AllowedUserNames => new[] { "ruticker" };
}
#endregion

#region Database Download Attribute
/// <summary>
/// Authorizes access to "ruticker" and "darikdan", with logging of access attempts.
/// </summary>
public class DbDownloadAttribute : UserNameAuthorizeAttribute
{
    protected override IEnumerable<string> AllowedUserNames => new[] { "ruticker", "adkomarov", "pazgld", "darkminer46", "888", "katarmind", "mishanya" };

    public override void OnAuthorization(AuthorizationFilterContext context)
    {
        var userName = context.HttpContext.User?.Identity?.Name;

        // Logging access attempts
        var logMessage = $"{userName ?? "null"} {DateTime.Now}";
        File.AppendAllText("c:/log/try_auth.txt", logMessage + Environment.NewLine);

        base.OnAuthorization(context);
    }
}
#endregion

#region Date Access Filter Attribute
/// <summary>
/// Restricts access based on the provided date parameter and current server time.
/// </summary>
public class DateAccessFilterAttribute : ActionFilterAttribute
{
    public string DateParameterName { get; set; }

    private const string AccessDeniedMessage = "Во время работы биржи доступны только последние 10 календарных дней. Полное скачивание на выходных или с 12 ночи до 10 утра";

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        /*
        if (context.ActionArguments.TryGetValue(DateParameterName, out var dateArgument))
        {
            if (dateArgument != null && DateTime.TryParse(dateArgument.ToString(), out var dateValue))
            {
                if (!IsAccessAllowed(dateValue))
                {
                    context.Result = new ObjectResult(AccessDeniedMessage) { StatusCode = 403 };
                    return;
                }
            }
        }*/

        base.OnActionExecuting(context);
    }

    /// <summary>
    /// Determines if access should be allowed based on the date and current time.
    /// </summary>
    private bool IsAccessAllowed(DateTime dateToCheck)
    {
        DateTime currentDate = DateTime.Now;

        // Allow access if the date is within the last 10 days
        if (dateToCheck.AddDays(10) > currentDate)
        {
            return true;
        }

        // Allow access on weekends
        if (currentDate.DayOfWeek == DayOfWeek.Saturday || currentDate.DayOfWeek == DayOfWeek.Sunday)
        {
            return true;
        }

        // Allow access between 12:00 AM and 10:00 AM
        var currentTime = currentDate.TimeOfDay;
        if (currentTime >= TimeSpan.Zero && currentTime <= TimeSpan.FromHours(10))
        {
            return true;
        }

        return false;
    }
}
#endregion
