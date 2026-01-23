using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

/// <summary>
/// Lightweight CLI argument parser.
/// </summary>
public static class CliParser
{
    public static CliParseResult Parse(string[] args)
    {
        var result = new CliParseResult();

        if (args.Length == 0)
        {
            result.ShowHelp = true;
            return result;
        }

        var options = new CliOptions();
        string? modeArg = null;
        bool showHelp = false;

        for (int i = 0; i < args.Length; i++)
        {
            var token = args[i];

            if (IsHelpToken(token))
            {
                showHelp = true;
                continue;
            }

            if (!token.StartsWith("-", StringComparison.Ordinal) && modeArg == null)
            {
                modeArg = token;
                continue;
            }

            switch (token.ToLowerInvariant())
            {
                case "--mode":
                    modeArg = ReadValue(args, ref i, token, result);
                    if (result.Error != null)
                    {
                        return result;
                    }
                    break;
                case "--tickers":
                    options.Tickers.AddRange(ParseList(ReadValue(args, ref i, token, result)));
                    if (result.Error != null) return result;
                    break;
                case "--report":
                    options.ReportTypes.AddRange(ParseList(ReadValue(args, ref i, token, result)));
                    if (result.Error != null) return result;
                    break;
                case "--periods":
                    options.Periods.AddRange(ParseList(ReadValue(args, ref i, token, result)));
                    if (result.Error != null) return result;
                    break;
                case "--indicators":
                    options.Indicators.AddRange(ParseList(ReadValue(args, ref i, token, result)));
                    if (result.Error != null) return result;
                    break;
                case "--sleep-ms":
                    options.SleepMs = ReadIntValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--output":
                    options.OutputRoot = ReadValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--logos-output":
                    options.LogosOutputDir = ReadValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--format":
                    options.LogoFormat = ReadLogoFormat(ReadValue(args, ref i, token, result), result);
                    if (result.Error != null) return result;
                    break;
                case "--dic-root":
                    options.DictionaryRoot = ReadValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--dic-period":
                    options.DictionaryPeriod = ReadValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--finam-input":
                    options.FinamInputDir = ReadValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--finam-output":
                    options.FinamOutputDir = ReadValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--finam-legend":
                    options.FinamLegendPath = ReadValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--finam-table":
                    options.FinamTableIndex = ReadIntValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                case "--dividends-output":
                case "--div-output":
                    options.OutputRoot = ReadValue(args, ref i, token, result);
                    if (result.Error != null) return result;
                    break;
                default:
                    result.Error = $"Неизвестный аргумент: {token}";
                    return result;
            }
        }

        if (string.IsNullOrWhiteSpace(modeArg))
        {
            result.ShowHelp = true;
            return result;
        }

        if (!TryParseMode(modeArg, out var mode))
        {
            result.Error = $"Неизвестный режим: {modeArg}";
            return result;
        }

        options.Mode = mode;
        result.Options = options;
        result.ShowHelp = showHelp;
        return result;
    }

    private static bool IsHelpToken(string token)
    {
        return token.Equals("--help", StringComparison.OrdinalIgnoreCase) ||
               token.Equals("-h", StringComparison.OrdinalIgnoreCase) ||
               token.Equals("/?", StringComparison.OrdinalIgnoreCase);
    }

    private static string ReadValue(string[] args, ref int index, string option, CliParseResult result)
    {
        if (index + 1 >= args.Length)
        {
            result.Error = $"Не задано значение для {option}.";
            return string.Empty;
        }

        index++;
        return args[index];
    }

    private static int ReadIntValue(string[] args, ref int index, string option, CliParseResult result)
    {
        var value = ReadValue(args, ref index, option, result);
        if (result.Error != null)
        {
            return 0;
        }

        if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            result.Error = $"Некорректное значение для {option}: {value}";
            return 0;
        }

        return parsed;
    }

    private static IEnumerable<string> ParseList(string value)
    {
        return value.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private static LogoFormat ReadLogoFormat(string value, CliParseResult result)
    {
        if (value.Equals("svg", StringComparison.OrdinalIgnoreCase))
        {
            return LogoFormat.Svg;
        }

        if (value.Equals("webp", StringComparison.OrdinalIgnoreCase))
        {
            return LogoFormat.Webp;
        }

        result.Error = $"Неизвестный формат логотипа: {value}";
        return LogoFormat.Webp;
    }

    private static bool TryParseMode(string value, out AppMode mode)
    {
        switch (value.ToLowerInvariant())
        {
            case "financial":
            case "fin":
            case "finance":
            case "reports":
                mode = AppMode.Financial;
                return true;
            case "diagrams":
            case "diagram":
            case "sostav":
                mode = AppMode.Diagrams;
                return true;
            case "shareholders":
            case "holders":
                mode = AppMode.Shareholders;
                return true;
            case "logos":
            case "logo":
                mode = AppMode.Logos;
                return true;
            case "finam":
                mode = AppMode.Finam;
                return true;
            case "dividends":
            case "dividend":
            case "divs":
            case "div":
            case "finam-dividends":
            case "finamdividends":
                mode = AppMode.Dividends;
                return true;
            default:
                mode = default;
                return false;
        }
    }
}
