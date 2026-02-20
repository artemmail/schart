namespace StockChart.UpdateService;

public sealed class OpenAiRewriteOptions
{
    public bool Enabled { get; set; } = true;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiKeyEnvVar { get; set; } = "OPENAI_API_KEY";
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public string Model { get; set; } = "gpt-5-mini";
    public string? Organization { get; set; }
    public string? Project { get; set; }
    public int TimeoutSeconds { get; set; } = 90;
    public double Temperature { get; set; } = 0.2;
    public int MaxOutputTokens { get; set; } = 3200;
}
