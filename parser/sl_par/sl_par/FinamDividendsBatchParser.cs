using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;

/// <summary>
/// Batch parser for local Finam dividends HTML files.
/// </summary>
public class FinamDividendsBatchParser
{
    private readonly FinamDividendsParser _parser;

    public FinamDividendsBatchParser(FinamDividendsParser? parser = null)
    {
        _parser = parser ?? new FinamDividendsParser();
    }

    public FinamDividendsBatchResult Run(string inputDirectory, string outputRoot)
    {
        var files = Directory.GetFiles(inputDirectory, "*.html");
        var failures = new List<string>();
        var notFound = new List<string>();
        var processed = 0;

        foreach (var file in files)
        {
            try
            {
                if (!_parser.TryParseFile(file, out var page, out var error))
                {
                    notFound.Add($"{Path.GetFileNameWithoutExtension(file)}: {error}");
                    continue;
                }

                var tickerDirectory = Path.Combine(outputRoot, page.Ticker);
                Directory.CreateDirectory(tickerDirectory);

                var outputPath = Path.Combine(tickerDirectory, "dividends.json");
                File.WriteAllText(outputPath, JsonConvert.SerializeObject(page, Formatting.Indented));
                processed++;
            }
            catch (Exception ex)
            {
                failures.Add($"{file}: {ex.Message}");
            }
        }

        return new FinamDividendsBatchResult(processed, notFound, failures);
    }
}

/// <summary>
/// Result summary for a dividends batch parse run.
/// </summary>
public class FinamDividendsBatchResult
{
    public FinamDividendsBatchResult(int processedCount, IReadOnlyList<string> notFoundTickers, IReadOnlyList<string> failedFiles)
    {
        ProcessedCount = processedCount;
        NotFoundTickers = notFoundTickers;
        FailedFiles = failedFiles;
    }

    public int ProcessedCount { get; }
    public IReadOnlyList<string> NotFoundTickers { get; }
    public IReadOnlyList<string> FailedFiles { get; }
}
