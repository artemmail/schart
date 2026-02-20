using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;

namespace StockChart.UpdateService.Services;

public readonly record struct OpenAiRewriteResult(bool IsSuccess, string Title, string Html, string? Error)
{
    public static OpenAiRewriteResult Success(string title, string html) => new(true, title, html, null);
    public static OpenAiRewriteResult Failed(string error) => new(false, string.Empty, string.Empty, error);
}

public readonly record struct OpenAiApiCallResult(string? Text, string? Error);

public sealed class OpenAiRewriteService
{
    private const string SystemPrompt =
        """
        Ты переписываешь текст на русском максимально подробно.
        Сохраняй исходный смысл, факты и порядок мыслей, но перефразируй.
        Не сокращай материал.
        Верни строго JSON-объект без markdown и комментариев:
        {"title":"...","html":"..."}
        В html сохрани HTML-разметку и ссылки.
        """;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OpenAiRewriteOptions _options;
    private readonly ILogger<OpenAiRewriteService> _logger;
    private const int SafeMaxOutputTokens = 16000;

    public OpenAiRewriteService(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenAiRewriteOptions> options,
        ILogger<OpenAiRewriteService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<OpenAiRewriteResult> RewriteAsync(string title, string html, CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
        {
            return OpenAiRewriteResult.Failed("OpenAI rewrite is disabled in configuration.");
        }

        var apiKey = ResolveApiKey();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return OpenAiRewriteResult.Failed("OpenAI API key is missing.");
        }

        var normalizedTitle = string.IsNullOrWhiteSpace(title) ? "Без заголовка" : title.Trim();
        var normalizedHtml = html?.Trim() ?? string.Empty;
        string? lastError = null;

        var responsesResult = await TryCallResponsesApiAsync(apiKey, normalizedTitle, normalizedHtml, cancellationToken);
        var responseText = responsesResult.Text;
        if (!string.IsNullOrWhiteSpace(responsesResult.Error))
        {
            lastError = responsesResult.Error;
        }

        if (string.IsNullOrWhiteSpace(responseText))
        {
            var chatResult = await TryCallChatCompletionsApiAsync(apiKey, normalizedTitle, normalizedHtml, cancellationToken);
            responseText = chatResult.Text;
            if (!string.IsNullOrWhiteSpace(chatResult.Error))
            {
                lastError = chatResult.Error;
            }
        }

        if (string.IsNullOrWhiteSpace(responseText))
        {
            return OpenAiRewriteResult.Failed(lastError ?? "OpenAI returned an empty response.");
        }

        if (!TryParseRewritePayload(responseText, out var rewrittenTitle, out var rewrittenHtml))
        {
            return OpenAiRewriteResult.Failed("OpenAI response does not contain a valid JSON payload.");
        }

        if (string.IsNullOrWhiteSpace(rewrittenTitle))
        {
            rewrittenTitle = normalizedTitle;
        }

        if (string.IsNullOrWhiteSpace(rewrittenHtml))
        {
            rewrittenHtml = normalizedHtml;
        }

        return OpenAiRewriteResult.Success(rewrittenTitle.Trim(), rewrittenHtml.Trim());
    }

    private string ResolveApiKey()
    {
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return _options.ApiKey.Trim();
        }

        if (string.IsNullOrWhiteSpace(_options.ApiKeyEnvVar))
        {
            return string.Empty;
        }

        return Environment.GetEnvironmentVariable(_options.ApiKeyEnvVar)?.Trim() ?? string.Empty;
    }

    private async Task<OpenAiApiCallResult> TryCallResponsesApiAsync(
        string apiKey,
        string title,
        string html,
        CancellationToken cancellationToken)
    {
        var maxOutputTokens = ResolveMaxOutputTokens();

        try
        {
            var payload = new JsonObject
            {
                ["model"] = _options.Model,
                ["input"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["role"] = "system",
                        ["content"] = new JsonArray
                        {
                            new JsonObject
                            {
                                ["type"] = "input_text",
                                ["text"] = SystemPrompt
                            }
                        }
                    },
                    new JsonObject
                    {
                        ["role"] = "user",
                        ["content"] = new JsonArray
                        {
                            new JsonObject
                            {
                                ["type"] = "input_text",
                                ["text"] = BuildUserPrompt(title, html)
                            }
                        }
                    }
                }
            };

            if (ShouldSendTemperature())
            {
                payload["temperature"] = _options.Temperature;
            }

            payload["max_output_tokens"] = maxOutputTokens;

            using var request = CreateRequest("responses", apiKey, payload);
            var (response, requestError) = await SendAsync(request, cancellationToken);
            if (response == null)
            {
                return new OpenAiApiCallResult(null, requestError ?? "OpenAI Responses request failed.");
            }

            using var responseDispose = response;
            var raw = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(raw);
            var text = ExtractResponsesOutputText(doc.RootElement);
            if (string.IsNullOrWhiteSpace(text))
            {
                return new OpenAiApiCallResult(null, "OpenAI Responses returned no output text.");
            }

            return new OpenAiApiCallResult(text, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI Responses request failed.");
            return new OpenAiApiCallResult(null, $"OpenAI Responses request failed: {ex.Message}");
        }
    }

    private async Task<OpenAiApiCallResult> TryCallChatCompletionsApiAsync(
        string apiKey,
        string title,
        string html,
        CancellationToken cancellationToken)
    {
        var maxOutputTokens = ResolveMaxOutputTokens();

        try
        {
            var payload = new JsonObject
            {
                ["model"] = _options.Model,
                ["max_completion_tokens"] = maxOutputTokens,
                ["messages"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["role"] = "system",
                        ["content"] = SystemPrompt
                    },
                    new JsonObject
                    {
                        ["role"] = "user",
                        ["content"] = BuildUserPrompt(title, html)
                    }
                }
            };

            if (ShouldSendTemperature())
            {
                payload["temperature"] = _options.Temperature;
            }

            using var request = CreateRequest("chat/completions", apiKey, payload);
            var (response, requestError) = await SendAsync(request, cancellationToken);
            if (response == null)
            {
                return new OpenAiApiCallResult(null, requestError ?? "OpenAI Chat Completions request failed.");
            }

            using var responseDispose = response;
            var raw = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(raw);
            var text = ExtractChatCompletionText(doc.RootElement);
            if (string.IsNullOrWhiteSpace(text))
            {
                return new OpenAiApiCallResult(null, "OpenAI Chat Completions returned no text.");
            }

            return new OpenAiApiCallResult(text, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI Chat Completions request failed.");
            return new OpenAiApiCallResult(null, $"OpenAI Chat Completions request failed: {ex.Message}");
        }
    }

    private HttpRequestMessage CreateRequest(string relativePath, string apiKey, object payload)
    {
        var baseUrl = string.IsNullOrWhiteSpace(_options.BaseUrl)
            ? "https://api.openai.com/v1"
            : _options.BaseUrl.TrimEnd('/');

        var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/{relativePath}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        if (!string.IsNullOrWhiteSpace(_options.Organization))
        {
            request.Headers.TryAddWithoutValidation("OpenAI-Organization", _options.Organization);
        }

        if (!string.IsNullOrWhiteSpace(_options.Project))
        {
            request.Headers.TryAddWithoutValidation("OpenAI-Project", _options.Project);
        }

        request.Content = JsonContent.Create(payload, options: JsonOptions);
        return request;
    }

    private async Task<(HttpResponseMessage? Response, string? Error)> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("OpenAiRewriteClient");
        client.Timeout = TimeSpan.FromSeconds(Math.Max(5, _options.TimeoutSeconds));

        var response = await client.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return (response, null);
        }

        var error = await response.Content.ReadAsStringAsync(cancellationToken);
        var errorMessage = $"OpenAI request failed: status={(int)response.StatusCode}, body={TrimForLog(error)}";
        _logger.LogWarning(
            "{ErrorMessage}",
            errorMessage);

        response.Dispose();
        return (null, errorMessage);
    }

    private int ResolveMaxOutputTokens()
    {
        var configured = _options.MaxOutputTokens;
        if (configured <= 0)
        {
            return 2200;
        }

        if (configured <= SafeMaxOutputTokens)
        {
            return configured;
        }

        _logger.LogWarning(
            "OpenAI max_output_tokens={Configured} is too high. Clamped to {Clamped}.",
            configured,
            SafeMaxOutputTokens);

        return SafeMaxOutputTokens;
    }

    private bool ShouldSendTemperature()
    {
        if (_options.Temperature < 0)
        {
            return false;
        }

        return !ModelRequiresDefaultTemperature(_options.Model);
    }

    private static bool ModelRequiresDefaultTemperature(string? model)
    {
        var normalized = NormalizeModelId(model);
        return normalized.StartsWith("gpt-5", StringComparison.Ordinal)
            || normalized.StartsWith("codex-", StringComparison.Ordinal);
    }

    private static string NormalizeModelId(string? model)
    {
        var normalized = (model ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized.Length == 0)
        {
            return normalized;
        }

        var slashIndex = normalized.LastIndexOf('/');
        if (slashIndex >= 0 && slashIndex < normalized.Length - 1)
        {
            normalized = normalized[(slashIndex + 1)..];
        }

        return normalized;
    }

    private static string BuildUserPrompt(string title, string html)
    {
        return
            """
            Перепиши заголовок и HTML-текст.
            Условия:
            1) Пересказ должен быть максимально подробным.
            2) Формулировки должны быть другими, но смысл и факты сохраняются.
            3) Не удаляй ссылки и не вырезай HTML-разметку.
            4) Ответ строго JSON: {"title":"...","html":"..."}.

            Заголовок:
            """
            + "\n"
            + title
            + "\n\nHTML:\n"
            + html;
    }

    private static string? ExtractResponsesOutputText(JsonElement root)
    {
        if (root.TryGetProperty("output_text", out var outputText) && outputText.ValueKind == JsonValueKind.String)
        {
            var value = outputText.GetString();
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        if (!root.TryGetProperty("output", out var output) || output.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var builder = new StringBuilder();

        foreach (var item in output.EnumerateArray())
        {
            if (!item.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var part in content.EnumerateArray())
            {
                if (!part.TryGetProperty("text", out var textElement) || textElement.ValueKind != JsonValueKind.String)
                {
                    continue;
                }

                var text = textElement.GetString();
                if (string.IsNullOrWhiteSpace(text))
                {
                    continue;
                }

                builder.AppendLine(text);
            }
        }

        var result = builder.ToString().Trim();
        return string.IsNullOrWhiteSpace(result) ? null : result;
    }

    private static string? ExtractChatCompletionText(JsonElement root)
    {
        if (!root.TryGetProperty("choices", out var choices) || choices.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var choice in choices.EnumerateArray())
        {
            if (!choice.TryGetProperty("message", out var message))
            {
                continue;
            }

            if (!message.TryGetProperty("content", out var content))
            {
                continue;
            }

            if (content.ValueKind == JsonValueKind.String)
            {
                var text = content.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    return text;
                }
            }

            if (content.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var builder = new StringBuilder();
            foreach (var part in content.EnumerateArray())
            {
                if (!part.TryGetProperty("text", out var textElement) || textElement.ValueKind != JsonValueKind.String)
                {
                    continue;
                }

                var text = textElement.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    builder.AppendLine(text);
                }
            }

            var joined = builder.ToString().Trim();
            if (!string.IsNullOrWhiteSpace(joined))
            {
                return joined;
            }
        }

        return null;
    }

    private static bool TryParseRewritePayload(string responseText, out string title, out string html)
    {
        title = string.Empty;
        html = string.Empty;

        var cleaned = StripCodeFence(responseText).Trim();

        if (TryParseJsonPayload(cleaned, out title, out html))
        {
            return true;
        }

        var start = cleaned.IndexOf('{');
        var end = cleaned.LastIndexOf('}');
        if (start < 0 || end <= start)
        {
            return false;
        }

        var jsonCandidate = cleaned.Substring(start, end - start + 1);
        return TryParseJsonPayload(jsonCandidate, out title, out html);
    }

    private static bool TryParseJsonPayload(string json, out string title, out string html)
    {
        title = string.Empty;
        html = string.Empty;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            if (root.TryGetProperty("title", out var titleElement) && titleElement.ValueKind == JsonValueKind.String)
            {
                title = titleElement.GetString() ?? string.Empty;
            }

            if (root.TryGetProperty("html", out var htmlElement) && htmlElement.ValueKind == JsonValueKind.String)
            {
                html = htmlElement.GetString() ?? string.Empty;
            }
            else if (root.TryGetProperty("text", out var textElement) && textElement.ValueKind == JsonValueKind.String)
            {
                html = textElement.GetString() ?? string.Empty;
            }

            return !string.IsNullOrWhiteSpace(title) || !string.IsNullOrWhiteSpace(html);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string StripCodeFence(string text)
    {
        var trimmed = text.Trim();
        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var lines = trimmed.Split('\n');
        if (lines.Length <= 2)
        {
            return trimmed;
        }

        var body = string.Join('\n', lines.Skip(1).Take(lines.Length - 2));
        return body.Trim();
    }

    private static string TrimForLog(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        const int max = 600;
        return value.Length <= max ? value : value[..max] + "...";
    }
}
