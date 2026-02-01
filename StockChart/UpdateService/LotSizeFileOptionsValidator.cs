using System.Collections.Generic;
using Microsoft.Extensions.Options;

namespace StockChart.UpdateService;

public sealed class LotSizeFileOptionsValidator : IValidateOptions<LotSizeFileOptions>
{
    public ValidateOptionsResult Validate(string? name, LotSizeFileOptions options)
    {
        var failures = new List<string>();

        if (string.IsNullOrWhiteSpace(options.FolderPath))
        {
            failures.Add("UpdateService:LotSizeFile:FolderPath is required.");
        }

        if (string.IsNullOrWhiteSpace(options.FilePattern))
        {
            failures.Add("UpdateService:LotSizeFile:FilePattern is required.");
        }

        return failures.Count > 0 ? ValidateOptionsResult.Fail(failures) : ValidateOptionsResult.Success;
    }
}
