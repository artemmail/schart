using Microsoft.Extensions.Options;

namespace StockChart.UpdateService;

public sealed class SmartLabTop24hOptionsValidator : IValidateOptions<SmartLabTop24hOptions>
{
    public ValidateOptionsResult Validate(string? name, SmartLabTop24hOptions options)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(options.TopUrl))
        {
            errors.Add("UpdateService:SmartLabTop24h:TopUrl is required.");
        }

        if (string.IsNullOrWhiteSpace(options.BaseUrl))
        {
            errors.Add("UpdateService:SmartLabTop24h:BaseUrl is required.");
        }

        if (string.IsNullOrWhiteSpace(options.TopSectionTitle))
        {
            errors.Add("UpdateService:SmartLabTop24h:TopSectionTitle is required.");
        }

        if (string.IsNullOrWhiteSpace(options.StockChartBaseUrl))
        {
            errors.Add("UpdateService:SmartLabTop24h:StockChartBaseUrl is required.");
        }

        if (options.MaxTopicsPerRun <= 0)
        {
            errors.Add("UpdateService:SmartLabTop24h:MaxTopicsPerRun must be greater than 0.");
        }

        return errors.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(errors);
    }
}
