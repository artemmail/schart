using System;
using System.IO;
using System.Text;

internal static class SignalRFlowFileLogger
{
    private static readonly object Sync = new();
    private const string LogFilePath = @"C:\temp\signalr-flow.log";

    public static void Write(string source, string message)
    {
        try
        {
            var directory = Path.GetDirectoryName(LogFilePath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff} [PID:{Environment.ProcessId}] {source} | {message}";
            lock (Sync)
            {
                File.AppendAllText(LogFilePath, line + Environment.NewLine, Encoding.UTF8);
            }
        }
        catch
        {
            // Never break realtime flow because diagnostics logging failed.
        }
    }
}
