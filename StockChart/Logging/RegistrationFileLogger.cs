using System.Text;

namespace StockChart.Logging;

internal static class RegistrationFileLogger
{
    private const string LogDirectory = @"c:\log";
    private const string LogFileName = "registration-email.log";
    private const string ErrorFileName = "registration-email-errors.log";
    private static readonly object Sync = new();

    public static void WriteInfo(string message)
    {
        Write(LogFileName, message);
    }

    public static void WriteError(string message, Exception exception)
    {
        Write(LogFileName, $"{message}{Environment.NewLine}{exception}");
        Write(ErrorFileName, $"{message}{Environment.NewLine}{exception}");
    }

    private static void Write(string fileName, string message)
    {
        try
        {
            Directory.CreateDirectory(LogDirectory);
            var path = Path.Combine(LogDirectory, fileName);
            var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff} [PID:{Environment.ProcessId}] {message}";

            lock (Sync)
            {
                File.AppendAllText(path, line + Environment.NewLine, Encoding.UTF8);
            }
        }
        catch
        {
            // Registration should not fail because fallback logging is unavailable.
        }
    }
}
