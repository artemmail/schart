using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;

/// <summary>
/// Batch parser for local Finam HTML files.
/// </summary>
public class FinamBatchParser
{
    private readonly FinancialTableParser _parser;

    public FinamBatchParser(FinancialTableParser? parser = null)
    {
        _parser = parser ?? new FinancialTableParser();
    }

    /// <summary>
    /// Parses all HTML files in the input directory and writes JSON output.
    /// </summary>
    public FinamBatchResult Run(string inputDirectory, string outputDirectory, string legendOutputPath, int tableIndex = 0)
    {
        var files = Directory.GetFiles(inputDirectory, "*.html");
        var failures = new List<string>();
        var processed = 0;

        FinancialTableParser.Descriptions.Clear();

        foreach (var file in files)
        {
            try
            {
                var rows = _parser.ParseFinancialTable(file, tableIndex);
                var convertedData = ConvertRows(rows);
                var ticker = Path.GetFileNameWithoutExtension(file);

                var tickerOutputDirectory = Path.Combine(outputDirectory, ticker, "FIN");
                Directory.CreateDirectory(tickerOutputDirectory);

                var outputFilePath = Path.Combine(tickerOutputDirectory, "data.json");
                File.WriteAllText(outputFilePath, JsonConvert.SerializeObject(convertedData, Formatting.Indented));
                processed++;
            }
            catch (Exception ex)
            {
                failures.Add($"{file}: {ex.Message}");
            }
        }

        if (!string.IsNullOrWhiteSpace(legendOutputPath))
        {
            var legendDirectory = Path.GetDirectoryName(legendOutputPath);
            if (!string.IsNullOrWhiteSpace(legendDirectory))
            {
                Directory.CreateDirectory(legendDirectory);
            }

            File.WriteAllText(legendOutputPath, JsonConvert.SerializeObject(FinancialTableParser.Descriptions, Formatting.Indented));
        }

        return new FinamBatchResult(processed, failures);
    }

    private static List<FinancialMetricValue> ConvertRows(IEnumerable<FinancialTableRow> dataItems)
    {
        var convertedList = new List<FinancialMetricValue>();

        foreach (var item in dataItems)
        {
            foreach (var kvp in item.DataChart)
            {
                convertedList.Add(new FinancialMetricValue
                {
                    Name = item.Title,
                    Year = kvp.Key,
                    Value = kvp.Value
                });
            }
        }

        return convertedList;
    }
}

/// <summary>
/// Result summary for a Finam batch parse run.
/// </summary>
public class FinamBatchResult
{
    public FinamBatchResult(int processedCount, IReadOnlyList<string> failedFiles)
    {
        ProcessedCount = processedCount;
        FailedFiles = failedFiles;
    }

    public int ProcessedCount { get; }
    public IReadOnlyList<string> FailedFiles { get; }
}
