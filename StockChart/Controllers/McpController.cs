using System.Diagnostics;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace StockChart.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class McpController : ControllerBase
{
    private const string ProtocolVersion = "2025-03-26";
    private const int InitializeRequestId = 1;
    private const int CallRequestId = 2;
    private const string LocalProviderName = "local";
    private const string OpenAiProviderName = "openai";
    private const string DefaultOpenAiSystemPrompt =
        "Ты ассистент MCP-консоли StockChart. Используй доступные tools для получения данных. " +
        "Если вопрос требует фактов и чисел, сначала делай tool calls, затем формируй ответ. " +
        "Если tool вернул VALIDATION_ERROR, исправь аргументы и повтори вызов. " +
        "Для marketCode используй числовой код (для акций MOEX обычно 0). " +
        "Отвечай кратко и по делу на русском языке.";
    private static readonly HashSet<string> MarkowitzTickerStopWords = new(StringComparer.Ordinal)
    {
        "MARKOWITZ",
        "MARKET",
        "MARKETCODE",
        "MOEX",
        "TOP",
        "MCP",
        "OPENAI",
        "TOOL",
        "TOOLS",
        "ADMIN",
        "CONSOLE",
        "RISK",
        "MIN",
        "MAX",
        "RETURN",
        "VARIANCE",
        "SHARPE",
        "VOLUME",
        "GROWTH",
        "LEADER",
        "LEADERS",
        "STOCK",
        "STOCKS"
    };

    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<McpController> _logger;

    public McpController(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IHttpClientFactory httpClientFactory,
        ILogger<McpController> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet("tools")]
    public async Task<IActionResult> GetTools(CancellationToken cancellationToken)
    {
        var callRequest = CreateRpcRequest(CallRequestId, "tools/list", new JsonObject());
        var execution = await ExecuteAsync(callRequest, cancellationToken);
        if (execution.Error != null)
        {
            return StatusCode(StatusCodes.Status502BadGateway, execution.Error);
        }

        var tools = execution.CallResponse?["result"]?["tools"]?.DeepClone() ?? new JsonArray();
        return Ok(new
        {
            tools,
            stderr = execution.Stderr,
            warnings = execution.Warnings
        });
    }

    [HttpGet("provider")]
    public IActionResult GetProvider()
    {
        var options = ResolveProviderOptions();
        var openAi = options.OpenAi;
        var hasApiKey = !string.IsNullOrWhiteSpace(TryResolveOpenAiApiKey(openAi));

        return Ok(new
        {
            provider = options.Provider,
            openAi = new
            {
                enabled = openAi.Enabled,
                model = openAi.Model,
                baseUrl = openAi.BaseUrl,
                hasApiKey,
                apiKeyEnvVar = openAi.ApiKeyEnvVar
            }
        });
    }

    [HttpPost("tool-call")]
    public async Task<IActionResult> ToolCall([FromBody] McpToolCallRequest request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Tool))
        {
            return BadRequest(new { error = "tool is required." });
        }

        var toolName = request.Tool.Trim();
        var argumentsNode = request.Arguments?.DeepClone() ?? new JsonObject();
        if (argumentsNode is not JsonObject)
        {
            return BadRequest(new { error = "arguments must be a JSON object." });
        }

        var result = await ExecuteToolCallInternalAsync(toolName, (JsonObject)argumentsNode, cancellationToken);
        if (result.BridgeError != null)
        {
            return StatusCode(StatusCodes.Status502BadGateway, result.BridgeError);
        }

        return Ok(new
        {
            tool = toolName,
            isError = result.IsError,
            payload = result.Payload,
            rpc = result.Rpc,
            stderr = result.Stderr,
            warnings = result.Warnings
        });
    }

    [HttpPost("rpc")]
    public async Task<IActionResult> Rpc([FromBody] McpRpcRequest request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Method))
        {
            return BadRequest(new { error = "method is required." });
        }

        var method = request.Method.Trim();
        if (string.Equals(method, "initialize", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "initialize is handled automatically by the bridge." });
        }

        var requestId = request.RequestId.GetValueOrDefault(CallRequestId);
        var callRequest = CreateRpcRequest(requestId, method, request.Params?.DeepClone());
        var execution = await ExecuteAsync(callRequest, cancellationToken);
        if (execution.Error != null)
        {
            return StatusCode(StatusCodes.Status502BadGateway, execution.Error);
        }

        return Ok(new
        {
            rpc = execution.CallResponse,
            stderr = execution.Stderr,
            warnings = execution.Warnings
        });
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] McpChatRequest request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { error = "message is required." });
        }

        var response = await HandleChatAsync(request, cancellationToken);
        return Ok(response);
    }

    private async Task<McpChatResponse> HandleChatAsync(McpChatRequest request, CancellationToken cancellationToken)
    {
        var message = request.Message!.Trim();
        var lower = message.ToLowerInvariant();

        if (lower is "/help" or "help" or "помощь")
        {
            return CreateHelpResponse();
        }

        if (lower.StartsWith("/tools", StringComparison.OrdinalIgnoreCase))
        {
            return await HandleToolsCommandAsync(cancellationToken);
        }

        if (lower.StartsWith("/tool ", StringComparison.OrdinalIgnoreCase))
        {
            return await HandleToolCommandAsync(message, cancellationToken);
        }

        if (lower.StartsWith("/rpc ", StringComparison.OrdinalIgnoreCase))
        {
            return await HandleRpcCommandAsync(message, cancellationToken);
        }

        var markowitzResponse = await TryHandleMarkowitzRequestAsync(message, lower, cancellationToken);
        if (markowitzResponse != null)
        {
            return markowitzResponse;
        }

        var providerResponse = await TryHandleOpenAiChatAsync(request, message, cancellationToken);
        if (providerResponse != null)
        {
            return providerResponse;
        }

        if (ContainsAny(lower, "рынк", "market"))
        {
            return await ExecuteToolAsChatAsync(
                "list_markets",
                new JsonObject(),
                "Показываю доступные рынки.",
                cancellationToken);
        }

        if (ContainsAny(lower, "дивиден", "dividend"))
        {
            var ticker = ExtractTickers(message).FirstOrDefault();
            if (ticker == null)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Answer = "Укажите тикер. Пример: дивиденды SBER",
                    Suggestions =
                    [
                        "дивиденды SBER",
                        "/tool dividends {\"ticker\":\"GAZP\"}"
                    ]
                };
            }

            return await ExecuteToolAsChatAsync(
                "dividends",
                new JsonObject { ["ticker"] = ticker },
                $"Дивиденды по {ticker}.",
                cancellationToken);
        }

        if (ContainsAny(lower, "барометр", "barometer"))
        {
            var tickers = ExtractTickers(message);
            var argumentsNode = new JsonObject { ["market"] = 0 };
            if (tickers.Count > 0)
            {
                var array = new JsonArray();
                foreach (var ticker in tickers)
                {
                    array.Add(ticker);
                }

                argumentsNode["tickers"] = array;
            }

            var intro = tickers.Count > 0
                ? $"Барометр для тикеров: {string.Join(", ", tickers)}."
                : "Барометр рынка по умолчанию (market=0).";

            return await ExecuteToolAsChatAsync(
                "fractal_barometer",
                argumentsNode,
                intro,
                cancellationToken);
        }

        if (ContainsAny(lower, "всплеск", "объем", "объём", "volume splash", "volume"))
        {
            return await ExecuteToolAsChatAsync(
                "volume_splash",
                new JsonObject
                {
                    ["bigPeriod"] = 31,
                    ["smallPeriod"] = 7,
                    ["splash"] = 3
                },
                "Сканирую всплески объемов (bigPeriod=31, smallPeriod=7, splash=3).",
                cancellationToken);
        }

        return new McpChatResponse
        {
            Answer = "Понимаю команды `/help`, `/tools`, `/tool ...`, `/rpc ...` и простые запросы вроде `дивиденды SBER`.",
            Suggestions =
            [
                "/help",
                "/tools",
                "покажи рынки",
                "дивиденды SBER",
                "барометр SBER GAZP"
            ]
        };
    }

    private async Task<McpChatResponse?> TryHandleOpenAiChatAsync(
        McpChatRequest request,
        string message,
        CancellationToken cancellationToken)
    {
        var providerOptions = ResolveProviderOptions();
        if (!string.Equals(providerOptions.Provider, OpenAiProviderName, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var openAi = providerOptions.OpenAi;
        if (!openAi.Enabled)
        {
            return new McpChatResponse
            {
                IsError = true,
                Provider = OpenAiProviderName,
                Model = openAi.Model,
                Answer = "OpenAI provider отключен в конфигурации (`McpProvider:OpenAi:Enabled=false`)."
            };
        }

        var apiKey = TryResolveOpenAiApiKey(openAi);
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return new McpChatResponse
            {
                IsError = true,
                Provider = OpenAiProviderName,
                Model = openAi.Model,
                Answer =
                    $"Не найден OpenAI API key. Укажите `McpProvider:OpenAi:ApiKey` " +
                    $"или переменную окружения `{openAi.ApiKeyEnvVar}`."
            };
        }

        var toolsRequest = CreateRpcRequest(CallRequestId, "tools/list", new JsonObject());
        var toolsExecution = await ExecuteAsync(toolsRequest, cancellationToken);
        if (toolsExecution.Error != null)
        {
            return new McpChatResponse
            {
                IsError = true,
                Provider = OpenAiProviderName,
                Model = openAi.Model,
                Answer = "Не удалось получить MCP tools перед обращением к OpenAI.",
                Data = toolsExecution.Error,
                Stderr = toolsExecution.Stderr,
                Warnings = toolsExecution.Warnings
            };
        }

        var openAiTools = BuildOpenAiTools(toolsExecution.CallResponse);
        var openAiMessages = BuildOpenAiMessages(request, message, openAi);
        var toolTrace = new JsonArray();
        var warnings = new List<string>();

        if (toolsExecution.Warnings.Count > 0)
        {
            warnings.AddRange(toolsExecution.Warnings);
        }

        for (var iteration = 0; iteration < openAi.MaxToolIterations; iteration++)
        {
            var completion = await CallOpenAiChatCompletionAsync(
                apiKey,
                openAi,
                openAiMessages,
                openAiTools,
                cancellationToken);

            if (!completion.IsSuccess)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = "Ошибка при обращении к OpenAI.",
                    Data = completion.Error,
                    Warnings = warnings.Count > 0 ? warnings : null
                };
            }

            var assistantMessage = completion.AssistantMessage;
            if (assistantMessage == null)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = "OpenAI вернул ответ без `choices[0].message`.",
                    Data = completion.RawResponse,
                    Warnings = warnings.Count > 0 ? warnings : null
                };
            }

            openAiMessages.Add(assistantMessage.DeepClone());

            var toolCalls = assistantMessage["tool_calls"] as JsonArray;
            if (toolCalls == null || toolCalls.Count == 0)
            {
                var answer = ExtractOpenAiContent(assistantMessage);
                if (string.IsNullOrWhiteSpace(answer))
                {
                    answer = TryBuildToolErrorFallback(toolTrace) ?? "OpenAI вернул пустой ответ.";
                }

                return new McpChatResponse
                {
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = answer,
                    Data = toolTrace.Count > 0 ? toolTrace : null,
                    Warnings = warnings.Count > 0 ? warnings : null
                };
            }

            foreach (var callNode in toolCalls)
            {
                var callId = callNode?["id"]?.GetValue<string>() ?? $"call_{Guid.NewGuid():N}";
                var toolName = callNode?["function"]?["name"]?.GetValue<string>();
                var argumentsRaw = callNode?["function"]?["arguments"]?.GetValue<string>() ?? "{}";

                if (string.IsNullOrWhiteSpace(toolName))
                {
                    var payload = new JsonObject
                    {
                        ["isError"] = true,
                        ["message"] = "Missing function.name in tool_call."
                    };

                    openAiMessages.Add(CreateOpenAiToolMessage(callId, payload));
                    toolTrace.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["isError"] = true,
                        ["error"] = "tool_call без function.name"
                    });
                    continue;
                }

                JsonObject argumentsObject;
                try
                {
                    argumentsObject = JsonNode.Parse(argumentsRaw) as JsonObject ?? new JsonObject();
                }
                catch (Exception ex)
                {
                    var payload = new JsonObject
                    {
                        ["isError"] = true,
                        ["message"] = "arguments JSON parse error",
                        ["exception"] = ex.Message,
                        ["source"] = Clip(argumentsRaw, 1024)
                    };

                    openAiMessages.Add(CreateOpenAiToolMessage(callId, payload));
                    toolTrace.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["isError"] = true,
                        ["error"] = payload.DeepClone()
                    });
                    continue;
                }

                var toolExecution = await ExecuteToolCallInternalAsync(toolName, argumentsObject, cancellationToken);
                if (toolExecution.Warnings.Count > 0)
                {
                    warnings.AddRange(toolExecution.Warnings);
                }

                JsonObject modelPayload;
                if (toolExecution.BridgeError != null)
                {
                    modelPayload = new JsonObject
                    {
                        ["isError"] = true,
                        ["error"] = toolExecution.BridgeError.DeepClone(),
                        ["stderr"] = Clip(toolExecution.Stderr, 1200)
                    };

                    toolTrace.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["arguments"] = argumentsObject.DeepClone(),
                        ["isError"] = true,
                        ["error"] = toolExecution.BridgeError.DeepClone()
                    });
                }
                else
                {
                    modelPayload = new JsonObject
                    {
                        ["isError"] = toolExecution.IsError,
                        ["data"] = toolExecution.Payload.DeepClone()
                    };

                    toolTrace.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["arguments"] = argumentsObject.DeepClone(),
                        ["isError"] = toolExecution.IsError,
                        ["data"] = toolExecution.Payload.DeepClone()
                    });
                }

                openAiMessages.Add(CreateOpenAiToolMessage(callId, modelPayload));
            }
        }

        return new McpChatResponse
        {
            IsError = true,
            Provider = OpenAiProviderName,
            Model = openAi.Model,
            Answer = $"Достигнут лимит tool-итераций OpenAI ({openAi.MaxToolIterations}).",
            Data = toolTrace.Count > 0 ? toolTrace : null,
            Warnings = warnings.Count > 0 ? warnings : null
        };
    }

    private async Task<OpenAiChatResult> CallOpenAiChatCompletionAsync(
        string apiKey,
        McpOpenAiOptions options,
        JsonArray messages,
        JsonArray tools,
        CancellationToken cancellationToken)
    {
        var endpoint = BuildUrl(options.BaseUrl, "chat/completions");
        var payload = new JsonObject
        {
            ["model"] = options.Model,
            ["messages"] = messages.DeepClone(),
            ["tool_choice"] = "auto"
        };

        if (tools.Count > 0)
        {
            payload["tools"] = tools.DeepClone();
        }

        if (ShouldSendTemperature(options))
        {
            payload["temperature"] = options.Temperature;
        }

        if (options.MaxCompletionTokens > 0)
        {
            payload["max_completion_tokens"] = options.MaxCompletionTokens;
        }

        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        if (!string.IsNullOrWhiteSpace(options.Organization))
        {
            httpRequest.Headers.TryAddWithoutValidation("OpenAI-Organization", options.Organization);
        }

        if (!string.IsNullOrWhiteSpace(options.Project))
        {
            httpRequest.Headers.TryAddWithoutValidation("OpenAI-Project", options.Project);
        }

        httpRequest.Content = new StringContent(
            SerializeOneLine(payload),
            Encoding.UTF8,
            "application/json");

        HttpResponseMessage httpResponse;
        string responseContent;

        try
        {
            httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);
            responseContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            return OpenAiChatResult.Fail(
                "HTTP call to OpenAI failed.",
                new JsonObject
                {
                    ["endpoint"] = endpoint,
                    ["exception"] = ex.Message
                });
        }

        JsonNode? parsedResponse = null;
        if (!string.IsNullOrWhiteSpace(responseContent))
        {
            try
            {
                parsedResponse = JsonNode.Parse(responseContent);
            }
            catch (Exception ex)
            {
                return OpenAiChatResult.Fail(
                    "OpenAI response JSON parse failed.",
                    new JsonObject
                    {
                        ["statusCode"] = (int)httpResponse.StatusCode,
                        ["exception"] = ex.Message,
                        ["raw"] = Clip(responseContent, 4000)
                    });
            }
        }

        if (!httpResponse.IsSuccessStatusCode)
        {
            return OpenAiChatResult.Fail(
                "OpenAI returned non-success status code.",
                new JsonObject
                {
                    ["statusCode"] = (int)httpResponse.StatusCode,
                    ["response"] = parsedResponse?.DeepClone() ?? JsonValue.Create(Clip(responseContent, 4000))
                });
        }

        var assistantMessage = parsedResponse?["choices"]?[0]?["message"] as JsonObject;
        if (assistantMessage == null)
        {
            return OpenAiChatResult.Fail(
                "OpenAI response does not contain choices[0].message.",
                new JsonObject
                {
                    ["response"] = parsedResponse?.DeepClone() ?? new JsonObject()
                });
        }

        return OpenAiChatResult.Success(assistantMessage, parsedResponse);
    }

    private static JsonArray BuildOpenAiTools(JsonNode? toolsListResponse)
    {
        var result = new JsonArray();
        if (toolsListResponse?["result"]?["tools"] is not JsonArray tools)
        {
            return result;
        }

        foreach (var tool in tools)
        {
            var name = tool?["name"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var description = tool?["description"]?.GetValue<string>() ?? $"MCP tool {name}";
            var schema = tool?["inputSchema"]?.DeepClone() as JsonObject ?? new JsonObject();

            if (schema["type"] == null)
            {
                schema["type"] = "object";
            }

            if (schema["properties"] == null)
            {
                schema["properties"] = new JsonObject();
            }

            result.Add(new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = name,
                    ["description"] = description,
                    ["parameters"] = schema
                }
            });
        }

        return result;
    }

    private static JsonArray BuildOpenAiMessages(McpChatRequest request, string message, McpOpenAiOptions options)
    {
        var messages = new JsonArray();

        var systemPrompt = string.IsNullOrWhiteSpace(options.SystemPrompt)
            ? DefaultOpenAiSystemPrompt
            : options.SystemPrompt!.Trim();

        messages.Add(new JsonObject
        {
            ["role"] = "system",
            ["content"] = systemPrompt
        });

        if (request.History != null)
        {
            foreach (var historyMessage in request.History
                         .Where(x => !string.IsNullOrWhiteSpace(x.Content))
                         .TakeLast(20))
            {
                var role = NormalizeOpenAiRole(historyMessage.Role);
                if (role == null)
                {
                    continue;
                }

                messages.Add(new JsonObject
                {
                    ["role"] = role,
                    ["content"] = historyMessage.Content!.Trim()
                });
            }
        }

        messages.Add(new JsonObject
        {
            ["role"] = "user",
            ["content"] = message
        });

        return messages;
    }

    private static JsonObject CreateOpenAiToolMessage(string toolCallId, JsonNode payload)
    {
        return new JsonObject
        {
            ["role"] = "tool",
            ["tool_call_id"] = toolCallId,
            ["content"] = SerializeOneLine(payload)
        };
    }

    private async Task<McpChatResponse?> TryHandleMarkowitzRequestAsync(
        string message,
        string lower,
        CancellationToken cancellationToken)
    {
        if (!ContainsAny(lower, "марковиц", "markowitz"))
        {
            return null;
        }

        var top = TryExtractTopCount(message, 10);
        var market = ResolveMarketCode(lower);
        var mode = ResolveMarkowitzMode(lower);
        var (startDate, endDate) = GetPreviousCalendarYearRangeUtc();
        var warnings = new List<string>();
        JsonNode? universeData = null;
        List<string> tickers;
        string universeDescription;

        var explicitTickers = ExtractTickersForMarkowitz(message);
        if (explicitTickers.Count >= 2)
        {
            tickers = explicitTickers;
            universeDescription = $"Источник бумаг: список пользователя ({tickers.Count}).";
        }
        else
        {
            if (explicitTickers.Count == 1)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Answer = "Для Марковица нужно минимум 2 тикера. Сейчас найден только 1.",
                    Data = new JsonObject
                    {
                        ["tickers"] = ToJsonArray(explicitTickers)
                    },
                    Suggestions =
                    [
                        "марковиц SBER GAZP LKOH TATN",
                        "марковиц топ 10 по объему за прошлый год",
                        "марковиц топ 10 по росту за прошлый год",
                        "марковиц топ 10 по падению за прошлый год"
                    ]
                };
            }

            var leadersDirection = TryResolveLeadersDirection(lower);
            if (!leadersDirection.HasValue)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Answer =
                        "Уточните входной набор для Марковица: либо перечислите тикеры, " +
                        "либо задайте критерий отбора (объем/рост/падение).",
                    Suggestions =
                    [
                        "марковиц SBER GAZP LKOH TATN",
                        "марковиц топ 10 по объему за прошлый год",
                        "марковиц топ 10 по росту за прошлый год",
                        "марковиц топ 10 по падению за прошлый год"
                    ]
                };
            }

            var leadersArgs = new JsonObject
            {
                ["market"] = market,
                ["dir"] = leadersDirection.Value,
                ["top"] = top,
                ["startDate"] = startDate.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
                ["endDate"] = endDate.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
                ["fields"] = "ticker,name,volume,percent"
            };

            var leaders = await ExecuteToolCallInternalAsync("market_leaders", leadersArgs, cancellationToken);
            if (leaders.Warnings.Count > 0)
            {
                warnings.AddRange(leaders.Warnings);
            }

            if (leaders.BridgeError != null)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Answer = "Не удалось получить список бумаг по выбранному критерию.",
                    ExecutedTool = "market_leaders",
                    Arguments = leadersArgs.DeepClone(),
                    Data = leaders.BridgeError,
                    Stderr = leaders.Stderr,
                    Warnings = warnings.Count > 0 ? warnings : null
                };
            }

            if (leaders.IsError)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Answer = "Tool `market_leaders` вернул ошибку.",
                    ExecutedTool = "market_leaders",
                    Arguments = leadersArgs.DeepClone(),
                    Data = leaders.Payload.DeepClone(),
                    Stderr = leaders.Stderr,
                    Warnings = warnings.Count > 0 ? warnings : null
                };
            }

            tickers = ExtractTickersFromLeadersPayload(leaders.Payload, top);
            universeData = leaders.Payload.DeepClone();
            universeDescription =
                $"Источник бумаг: top-{tickers.Count} по критерию `{LeadersDirectionLabel(leadersDirection.Value)}`.";
        }

        if (tickers.Count < 2)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "Недостаточно данных для оптимизации Марковица (нужно минимум 2 тикера).",
                Data = universeData,
                Warnings = warnings.Count > 0 ? warnings : null
            };
        }

        var attempts = BuildMarkowitzAttempts(mode);

        McpToolExecutionView? optimization = null;
        JsonObject? optimizationArgs = null;
        double? usedRisk = null;
        string? usedMode = null;
        string optimizationStderr = string.Empty;

        foreach (var attemptConfig in attempts)
        {
            var tickersArray = new JsonArray();
            foreach (var ticker in tickers)
            {
                tickersArray.Add(ticker);
            }

            var args = new JsonObject
            {
                ["tickers"] = tickersArray,
                ["startDate"] = startDate.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
                ["endDate"] = endDate.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
                ["risk"] = attemptConfig.Risk,
                ["mode"] = attemptConfig.Mode,
                ["maxWeight"] = 0.4,
                ["fields"] = "success,actual,stddev,chart",
                ["topN"] = top
            };

            var attempt = await ExecuteToolCallInternalAsync("portfolio_markowitz", args, cancellationToken);
            if (attempt.Warnings.Count > 0)
            {
                warnings.AddRange(attempt.Warnings);
            }

            optimizationStderr = attempt.Stderr;
            if (attempt.BridgeError != null)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Answer = "Не удалось выполнить оптимизацию Марковица.",
                    ExecutedTool = "portfolio_markowitz",
                    Arguments = args.DeepClone(),
                    Data = attempt.BridgeError,
                    Stderr = attempt.Stderr,
                    Warnings = warnings.Count > 0 ? warnings : null
                };
            }

            optimization = attempt;
            optimizationArgs = args;
            usedRisk = attemptConfig.Risk;
            usedMode = attemptConfig.Mode;

            if (attempt.IsError)
            {
                continue;
            }

            var success = attempt.Payload?["success"]?.GetValue<bool>() ?? false;
            if (success)
            {
                break;
            }
        }

        if (optimization == null || optimizationArgs == null || usedRisk == null || string.IsNullOrWhiteSpace(usedMode))
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "Не удалось построить портфель Марковица.",
                Data = new JsonObject
                {
                    ["universe"] = universeData ?? ToJsonArray(tickers)
                },
                Warnings = warnings.Count > 0 ? warnings : null
            };
        }

        if (optimization.IsError || !(optimization.Payload?["success"]?.GetValue<bool>() ?? false))
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "Tool `portfolio_markowitz` не смог построить решение для выбранных параметров.",
                ExecutedTool = "portfolio_markowitz",
                Arguments = optimizationArgs.DeepClone(),
                Data = optimization.Payload.DeepClone(),
                Stderr = optimizationStderr,
                Warnings = warnings.Count > 0 ? warnings : null
            };
        }

        var chart = ExtractPortfolioChart(optimization.Payload);
        var actual = TryReadDecimal(optimization.Payload?["actual"]);
        var stddev = TryReadDecimal(optimization.Payload?["stddev"]);

        var lines = new List<string>
        {
            $"Портфель Марковица (рынок {market}, период {startDate:yyyy-MM-dd} - {endDate:yyyy-MM-dd}).",
            universeDescription,
            $"Режим: {usedMode}, риск: {usedRisk.Value.ToString("0.##", CultureInfo.InvariantCulture)}."
        };

        if (!string.Equals(mode, usedMode, StringComparison.OrdinalIgnoreCase))
        {
            lines.Add($"Запрошенный режим `{mode}` не дал решения, использован fallback `{usedMode}`.");
        }

        if (actual.HasValue || stddev.HasValue)
        {
            var actualText = actual.HasValue ? actual.Value.ToString("0.####", CultureInfo.InvariantCulture) : "n/a";
            var stddevText = stddev.HasValue ? stddev.Value.ToString("0.####", CultureInfo.InvariantCulture) : "n/a";
            lines.Add($"Показатели: actual={actualText}, stddev={stddevText}.");
        }

        if (chart.Count > 0)
        {
            lines.Add("Состав:");
            for (var i = 0; i < chart.Count; i++)
            {
                var item = chart[i];
                lines.Add($"{i + 1}. {item.Ticker} - {item.Percent.ToString("0.##", CultureInfo.InvariantCulture)}%");
            }
        }
        else
        {
            lines.Add("Состав портфеля пустой.");
        }

        return new McpChatResponse
        {
            Answer = string.Join('\n', lines),
            Data = new JsonObject
            {
                ["universe"] = universeData ?? ToJsonArray(tickers),
                ["markowitz"] = optimization.Payload.DeepClone()
            },
            Warnings = warnings.Count > 0 ? warnings : null
        };
    }

    private static string ExtractOpenAiContent(JsonObject assistantMessage)
    {
        if (assistantMessage["content"] is JsonValue value && value.TryGetValue<string>(out var contentText))
        {
            return contentText;
        }

        if (assistantMessage["content"] is not JsonArray parts)
        {
            return string.Empty;
        }

        var texts = new List<string>();
        foreach (var part in parts)
        {
            var text = part?["text"]?.GetValue<string>();
            if (!string.IsNullOrWhiteSpace(text))
            {
                texts.Add(text);
            }
        }

        return texts.Count == 0 ? string.Empty : string.Join("\n", texts);
    }

    private static string? TryBuildToolErrorFallback(JsonArray toolTrace)
    {
        for (var i = toolTrace.Count - 1; i >= 0; i--)
        {
            if (toolTrace[i] is not JsonObject entry)
            {
                continue;
            }

            var message = entry["data"]?["error"]?["message"]?.GetValue<string>()
                          ?? entry["error"]?["message"]?.GetValue<string>()
                          ?? entry["error"]?.GetValue<string>();

            if (string.IsNullOrWhiteSpace(message))
            {
                continue;
            }

            return $"Tool вернул ошибку: {message.Trim()}";
        }

        return null;
    }

    private static string? NormalizeOpenAiRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        if (string.Equals(role, "user", StringComparison.OrdinalIgnoreCase))
        {
            return "user";
        }

        if (string.Equals(role, "assistant", StringComparison.OrdinalIgnoreCase))
        {
            return "assistant";
        }

        if (string.Equals(role, "system", StringComparison.OrdinalIgnoreCase))
        {
            return "system";
        }

        return null;
    }

    private McpProviderOptions ResolveProviderOptions()
    {
        var options = _configuration.GetSection("McpProvider").Get<McpProviderOptions>() ?? new McpProviderOptions();

        options.Provider = string.IsNullOrWhiteSpace(options.Provider)
            ? LocalProviderName
            : options.Provider.Trim().ToLowerInvariant();

        options.OpenAi ??= new McpOpenAiOptions();

        if (string.IsNullOrWhiteSpace(options.OpenAi.Model))
        {
            options.OpenAi.Model = "gpt-4o-mini";
        }

        if (string.IsNullOrWhiteSpace(options.OpenAi.BaseUrl))
        {
            options.OpenAi.BaseUrl = "https://api.openai.com/v1";
        }

        if (string.IsNullOrWhiteSpace(options.OpenAi.ApiKeyEnvVar))
        {
            options.OpenAi.ApiKeyEnvVar = "OPENAI_API_KEY";
        }

        options.OpenAi.TimeoutSeconds = Math.Clamp(options.OpenAi.TimeoutSeconds, 10, 300);
        options.OpenAi.MaxToolIterations = Math.Clamp(options.OpenAi.MaxToolIterations, 1, 8);
        options.OpenAi.MaxCompletionTokens = Math.Clamp(options.OpenAi.MaxCompletionTokens, 64, 8192);

        return options;
    }

    private static string? TryResolveOpenAiApiKey(McpOpenAiOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.ApiKeyEnvVar))
        {
            var fromEnv = Environment.GetEnvironmentVariable(options.ApiKeyEnvVar.Trim());
            if (!string.IsNullOrWhiteSpace(fromEnv))
            {
                return fromEnv.Trim();
            }
        }

        if (!string.IsNullOrWhiteSpace(options.ApiKey))
        {
            return options.ApiKey.Trim();
        }

        return null;
    }

    private static string BuildUrl(string baseUrl, string path)
    {
        var normalizedBase = (baseUrl ?? string.Empty).Trim().TrimEnd('/');
        var normalizedPath = path.TrimStart('/');

        if (string.IsNullOrWhiteSpace(normalizedBase))
        {
            normalizedBase = "https://api.openai.com/v1";
        }

        return $"{normalizedBase}/{normalizedPath}";
    }

    private static bool ShouldSendTemperature(McpOpenAiOptions options)
    {
        if (options.Temperature < 0)
        {
            return false;
        }

        return !ModelRequiresDefaultTemperature(options.Model);
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

    private async Task<McpChatResponse> HandleToolsCommandAsync(CancellationToken cancellationToken)
    {
        var callRequest = CreateRpcRequest(CallRequestId, "tools/list", new JsonObject());
        var execution = await ExecuteAsync(callRequest, cancellationToken);
        if (execution.Error != null)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "Не удалось получить список tools.",
                Data = execution.Error,
                Stderr = execution.Stderr,
                Warnings = execution.Warnings
            };
        }

        var toolNames = ExtractToolNames(execution.CallResponse);
        return new McpChatResponse
        {
            Answer = toolNames.Count == 0
                ? "Tools не найдены."
                : $"Доступно tools: {string.Join(", ", toolNames)}",
            Data = execution.CallResponse?["result"]?["tools"]?.DeepClone() ?? new JsonArray(),
            Stderr = execution.Stderr,
            Warnings = execution.Warnings
        };
    }

    private async Task<McpChatResponse> HandleToolCommandAsync(string message, CancellationToken cancellationToken)
    {
        var parts = message.Split(' ', 3, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "Формат: /tool <name> <json-arguments>. Пример: /tool list_markets {}"
            };
        }

        var toolName = parts[1].Trim();
        var argumentsText = parts.Length >= 3 ? parts[2].Trim() : "{}";

        JsonNode? parsedArguments;
        try
        {
            parsedArguments = JsonNode.Parse(argumentsText);
        }
        catch (Exception ex)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "JSON arguments не распарсились.",
                Data = new JsonObject
                {
                    ["message"] = ex.Message,
                    ["source"] = argumentsText
                }
            };
        }

        if (parsedArguments is not JsonObject argumentsObject)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "arguments должны быть JSON-объектом, например {\"ticker\":\"SBER\"}."
            };
        }

        return await ExecuteToolAsChatAsync(
            toolName,
            argumentsObject,
            $"Выполнил tool `{toolName}`.",
            cancellationToken);
    }

    private async Task<McpChatResponse> HandleRpcCommandAsync(string message, CancellationToken cancellationToken)
    {
        var parts = message.Split(' ', 3, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "Формат: /rpc <method> <json-params>. Пример: /rpc tools/list {}"
            };
        }

        var method = parts[1].Trim();
        if (string.Equals(method, "initialize", StringComparison.OrdinalIgnoreCase))
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "initialize вызывается автоматически."
            };
        }

        var paramsText = parts.Length >= 3 ? parts[2].Trim() : "{}";
        JsonNode? parametersNode;
        try
        {
            parametersNode = JsonNode.Parse(paramsText);
        }
        catch (Exception ex)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "JSON params не распарсились.",
                Data = new JsonObject
                {
                    ["message"] = ex.Message,
                    ["source"] = paramsText
                }
            };
        }

        var callRequest = CreateRpcRequest(CallRequestId, method, parametersNode);
        var execution = await ExecuteAsync(callRequest, cancellationToken);
        if (execution.Error != null)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = $"RPC `{method}` завершился ошибкой.",
                Data = execution.Error,
                Stderr = execution.Stderr,
                Warnings = execution.Warnings
            };
        }

        return new McpChatResponse
        {
            Answer = $"RPC `{method}` выполнен.",
            Data = execution.CallResponse?.DeepClone() ?? new JsonObject(),
            Stderr = execution.Stderr,
            Warnings = execution.Warnings
        };
    }

    private async Task<McpChatResponse> ExecuteToolAsChatAsync(
        string toolName,
        JsonObject argumentsObject,
        string successIntro,
        CancellationToken cancellationToken)
    {
        var result = await ExecuteToolCallInternalAsync(toolName, argumentsObject, cancellationToken);
        if (result.BridgeError != null)
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = $"Ошибка bridge при вызове `{toolName}`.",
                ExecutedTool = toolName,
                Arguments = argumentsObject.DeepClone(),
                Data = result.BridgeError,
                Stderr = result.Stderr,
                Warnings = result.Warnings
            };
        }

        return new McpChatResponse
        {
            IsError = result.IsError,
            Answer = result.IsError
                ? $"Tool `{toolName}` вернул ошибку."
                : successIntro,
            ExecutedTool = toolName,
            Arguments = argumentsObject.DeepClone(),
            Data = result.Payload,
            Stderr = result.Stderr,
            Warnings = result.Warnings
        };
    }

    private async Task<McpToolExecutionView> ExecuteToolCallInternalAsync(
        string toolName,
        JsonObject argumentsObject,
        CancellationToken cancellationToken)
    {
        var callParams = new JsonObject
        {
            ["name"] = toolName,
            ["arguments"] = argumentsObject
        };

        var callRequest = CreateRpcRequest(CallRequestId, "tools/call", callParams);
        var execution = await ExecuteAsync(callRequest, cancellationToken);
        if (execution.Error != null)
        {
            return new McpToolExecutionView
            {
                BridgeError = execution.Error,
                Stderr = execution.Stderr,
                Warnings = execution.Warnings
            };
        }

        var resultNode = execution.CallResponse?["result"];
        var isError = resultNode?["isError"]?.GetValue<bool>() ?? true;
        var contentText = resultNode?["content"]?[0]?["text"]?.GetValue<string>();

        JsonNode payload = new JsonObject();
        if (!string.IsNullOrWhiteSpace(contentText))
        {
            try
            {
                payload = JsonNode.Parse(contentText) ?? new JsonObject();
            }
            catch
            {
                payload = JsonValue.Create(contentText);
            }
        }

        return new McpToolExecutionView
        {
            IsError = isError,
            Payload = payload,
            Rpc = execution.CallResponse?.DeepClone() ?? new JsonObject(),
            Stderr = execution.Stderr,
            Warnings = execution.Warnings
        };
    }

    private static McpChatResponse CreateHelpResponse()
    {
        return new McpChatResponse
        {
            Answer =
                "Команды: `/tools`, `/tool <name> <json>`, `/rpc <method> <json>`. " +
                "Также можно писать запросы вроде `дивиденды SBER`, `покажи рынки`, `барометр SBER GAZP`.",
            Suggestions =
            [
                "/tools",
                "/tool list_markets {}",
                "/tool dividends {\"ticker\":\"SBER\"}",
                "дивиденды GAZP",
                "барометр SBER GAZP",
                "подбери портфель марковица из топ 10 акций по объему за прошлый год"
            ]
        };
    }

    private static List<string> ExtractToolNames(JsonNode? callResponse)
    {
        var names = new List<string>();
        if (callResponse?["result"]?["tools"] is not JsonArray toolsArray)
        {
            return names;
        }

        foreach (var toolNode in toolsArray)
        {
            var name = toolNode?["name"]?.GetValue<string>();
            if (!string.IsNullOrWhiteSpace(name))
            {
                names.Add(name);
            }
        }

        return names;
    }

    private static List<string> ExtractTickers(string message)
    {
        return Regex.Matches(message.ToUpperInvariant(), @"\b[A-Z]{2,10}\b")
            .Select(match => match.Value)
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    private static List<string> ExtractTickersForMarkowitz(string message)
    {
        return Regex.Matches(message.ToUpperInvariant(), @"\b(?:T|[A-Z][A-Z0-9]{1,9})\b")
            .Select(match => match.Value)
            .Where(token => !MarkowitzTickerStopWords.Contains(token))
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    private static int ResolveMarketCode(string lower)
    {
        if (string.IsNullOrWhiteSpace(lower))
        {
            return 0;
        }

        var numeric = Regex.Match(
            lower,
            @"(?:marketcode|market|рынок)\s*(?:=|:)?\s*(-?\d{1,4})",
            RegexOptions.IgnoreCase);

        if (numeric.Success
            && int.TryParse(numeric.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var code)
            && code >= 0)
        {
            return code;
        }

        if (ContainsAny(lower, "moex", "мосбир", "московск"))
        {
            return 0;
        }

        return 0;
    }

    private static int? TryResolveLeadersDirection(string lower)
    {
        if (string.IsNullOrWhiteSpace(lower))
        {
            return null;
        }

        var candidates = new List<(int Index, int Direction)>
        {
            (FindFirstIndex(lower, "объем", "объём", "volume", "ликвид"), 0),
            (FindFirstIndex(lower, "рост", "вырос", "gainer", "growth", "up", "плюс"), 1),
            (FindFirstIndex(lower, "паден", "сниж", "loser", "decline", "drop", "down", "минус"), 2)
        };

        var best = candidates
            .Where(x => x.Index >= 0)
            .OrderBy(x => x.Index)
            .Select(x => (int?)x.Direction)
            .FirstOrDefault();

        return best;
    }

    private static string LeadersDirectionLabel(int direction)
    {
        return direction switch
        {
            1 => "рост",
            2 => "падение",
            _ => "объем"
        };
    }

    private static int FindFirstIndex(string source, params string[] patterns)
    {
        var best = -1;
        foreach (var pattern in patterns)
        {
            var index = source.IndexOf(pattern, StringComparison.OrdinalIgnoreCase);
            if (index < 0)
            {
                continue;
            }

            if (best < 0 || index < best)
            {
                best = index;
            }
        }

        return best;
    }

    private static JsonArray ToJsonArray(IEnumerable<string> values)
    {
        var array = new JsonArray();
        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            array.Add(value.Trim().ToUpperInvariant());
        }

        return array;
    }

    private static List<string> ExtractTickersFromLeadersPayload(JsonNode? payload, int take)
    {
        var result = new List<string>();
        if (payload == null)
        {
            return result;
        }

        var rows = payload["items"] as JsonArray ?? payload as JsonArray;
        if (rows == null)
        {
            return result;
        }

        foreach (var node in rows)
        {
            var ticker = node?["ticker"]?.GetValue<string>()?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(ticker))
            {
                continue;
            }

            result.Add(ticker);
            if (result.Count >= take)
            {
                break;
            }
        }

        return result.Distinct(StringComparer.Ordinal).ToList();
    }

    private static List<MarkowitzChartLine> ExtractPortfolioChart(JsonNode? payload)
    {
        var chart = new List<MarkowitzChartLine>();
        if (payload?["chart"] is not JsonArray rows)
        {
            return chart;
        }

        foreach (var row in rows)
        {
            var ticker = row?["ticker"]?.GetValue<string>()?.Trim().ToUpperInvariant();
            var percent = TryReadDecimal(row?["percent"]);
            if (string.IsNullOrWhiteSpace(ticker) || !percent.HasValue)
            {
                continue;
            }

            chart.Add(new MarkowitzChartLine(ticker, percent.Value));
        }

        return chart
            .OrderByDescending(x => x.Percent)
            .ToList();
    }

    private static decimal? TryReadDecimal(JsonNode? node)
    {
        if (node == null)
        {
            return null;
        }

        try
        {
            return node.GetValue<decimal>();
        }
        catch
        {
            try
            {
                var asDouble = node.GetValue<double>();
                return Convert.ToDecimal(asDouble, CultureInfo.InvariantCulture);
            }
            catch
            {
                return null;
            }
        }
    }

    private static int TryExtractTopCount(string message, int defaultValue)
    {
        var match = Regex.Match(message, @"(?:топ|top)\s*[-:]?\s*(\d{1,3})", RegexOptions.IgnoreCase);
        if (!match.Success)
        {
            match = Regex.Match(message, @"\b(\d{1,3})\s*(?:акц|тикер|бумаг)", RegexOptions.IgnoreCase);
        }

        if (match.Success
            && int.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return Math.Clamp(parsed, 2, 50);
        }

        return Math.Clamp(defaultValue, 2, 50);
    }

    private static string ResolveMarkowitzMode(string lower)
    {
        if (lower.Contains("min_variance", StringComparison.OrdinalIgnoreCase)
            || lower.Contains("миним", StringComparison.OrdinalIgnoreCase))
        {
            return "min_variance";
        }

        if (lower.Contains("max_return", StringComparison.OrdinalIgnoreCase)
            || lower.Contains("макс доход", StringComparison.OrdinalIgnoreCase))
        {
            return "max_return";
        }

        return "max_sharpe";
    }

    private static List<(string Mode, double Risk)> BuildMarkowitzAttempts(string requestedMode)
    {
        var attempts = new List<(string Mode, double Risk)>();

        if (string.Equals(requestedMode, "max_sharpe", StringComparison.OrdinalIgnoreCase))
        {
            attempts.Add(("max_sharpe", 0.35));
            attempts.Add(("max_sharpe", 0.6));
            attempts.Add(("max_sharpe", 1.0));
        }
        else if (string.Equals(requestedMode, "max_return", StringComparison.OrdinalIgnoreCase))
        {
            attempts.Add(("max_return", 0.4));
            attempts.Add(("max_return", 0.8));
            attempts.Add(("max_return", 1.2));
        }
        else
        {
            attempts.Add(("min_variance", 0.01));
            attempts.Add(("min_variance", 0.02));
            attempts.Add(("min_variance", 0.05));
            attempts.Add(("min_variance", 0.1));
        }

        // Reliable fallback for cases where max_sharpe/max_return return no feasible solution.
        attempts.Add(("min_variance", 0.01));
        attempts.Add(("min_variance", 0.02));
        attempts.Add(("min_variance", 0.05));

        return attempts
            .Distinct()
            .ToList();
    }

    private static (DateTime Start, DateTime End) GetPreviousCalendarYearRangeUtc()
    {
        var year = DateTime.UtcNow.Year - 1;
        var start = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(year, 12, 31, 23, 59, 59, DateTimeKind.Utc);
        return (start, end);
    }

    private static bool ContainsAny(string source, params string[] patterns)
    {
        return patterns.Any(pattern => source.Contains(pattern, StringComparison.OrdinalIgnoreCase));
    }

    private sealed record MarkowitzChartLine(string Ticker, decimal Percent);

    private async Task<McpExecutionResult> ExecuteAsync(JsonObject callRequest, CancellationToken cancellationToken)
    {
        var options = ResolveOptions();
        var scriptPath = ResolveScriptPath(options.ScriptPath);
        if (!System.IO.File.Exists(scriptPath))
        {
            return McpExecutionResult.Fail(
                "MCP python script was not found.",
                details: new JsonObject
                {
                    ["scriptPath"] = scriptPath
                });
        }

        var baseUrl = !string.IsNullOrWhiteSpace(options.StockChartBaseUrl)
            ? options.StockChartBaseUrl!.Trim().TrimEnd('/')
            : $"{Request.Scheme}://{Request.Host}";
        var utf8NoBom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);

        var processStartInfo = new ProcessStartInfo
        {
            FileName = options.PythonExecutable,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardInputEncoding = utf8NoBom,
            StandardOutputEncoding = utf8NoBom,
            StandardErrorEncoding = utf8NoBom,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = _environment.ContentRootPath
        };

        processStartInfo.ArgumentList.Add(scriptPath);
        processStartInfo.Environment["PYTHONUTF8"] = "1";
        processStartInfo.Environment["PYTHONIOENCODING"] = "utf-8";
        processStartInfo.Environment["STOCKCHART_BASE_URL"] = baseUrl;
        processStartInfo.Environment["STOCKCHART_TIMEOUT_SEC"] =
            options.TimeoutSeconds.ToString(CultureInfo.InvariantCulture);

        if (options.InsecureTls)
        {
            processStartInfo.Environment["STOCKCHART_INSECURE_TLS"] = "1";
        }

        if (!string.IsNullOrWhiteSpace(options.DefaultCandlesProfile))
        {
            processStartInfo.Environment["STOCKCHART_DEFAULT_CANDLES_PROFILE"] = options.DefaultCandlesProfile;
        }

        if (!string.IsNullOrWhiteSpace(options.DefaultListProfile))
        {
            processStartInfo.Environment["STOCKCHART_DEFAULT_LIST_PROFILE"] = options.DefaultListProfile;
        }

        using var process = new Process
        {
            StartInfo = processStartInfo
        };

        try
        {
            process.Start();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start MCP process. Python: {PythonExecutable}", options.PythonExecutable);
            return McpExecutionResult.Fail(
                "Failed to start MCP process.",
                details: new JsonObject
                {
                    ["pythonExecutable"] = options.PythonExecutable,
                    ["scriptPath"] = scriptPath,
                    ["exception"] = ex.Message
                });
        }

        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();

        try
        {
            await process.StandardInput.WriteLineAsync(SerializeOneLine(CreateInitializeRequest()));
            await process.StandardInput.WriteLineAsync(SerializeOneLine(callRequest));
            await process.StandardInput.FlushAsync();
            process.StandardInput.Close();
        }
        catch (Exception ex)
        {
            TryKill(process);
            return McpExecutionResult.Fail(
                "Failed to send request to MCP process.",
                details: new JsonObject
                {
                    ["exception"] = ex.Message
                });
        }

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(options.TimeoutSeconds));

        try
        {
            await process.WaitForExitAsync(timeoutCts.Token);
        }
        catch (OperationCanceledException)
        {
            TryKill(process);
            var timedOutStdout = await SafeReadAsync(stdoutTask);
            var timedOutStderr = await SafeReadAsync(stderrTask);
            return McpExecutionResult.Fail(
                $"MCP process timed out after {options.TimeoutSeconds} seconds.",
                details: new JsonObject
                {
                    ["stdout"] = Clip(timedOutStdout),
                    ["stderr"] = Clip(timedOutStderr)
                });
        }

        var stdout = await SafeReadAsync(stdoutTask);
        var stderr = NormalizeStderr(await SafeReadAsync(stderrTask));
        var lines = SplitNonEmptyLines(stdout);
        var warnings = new List<string>();
        var parsedResponses = new List<JsonNode>();

        foreach (var line in lines)
        {
            try
            {
                var node = JsonNode.Parse(line);
                if (node != null)
                {
                    parsedResponses.Add(node);
                }
            }
            catch
            {
                warnings.Add($"Unparsed stdout line: {Clip(line, 240)}");
            }
        }

        var callResponse = parsedResponses.FirstOrDefault(node => IsResponseForId(node, callRequest["id"]));
        if (callResponse == null)
        {
            return McpExecutionResult.Fail(
                "MCP response for call request was not found.",
                stderr: stderr,
                warnings: warnings,
                details: new JsonObject
                {
                    ["stdout"] = Clip(stdout),
                    ["stderr"] = Clip(stderr)
                });
        }

        if (callResponse["error"] != null)
        {
            return McpExecutionResult.Fail(
                "MCP returned JSON-RPC error.",
                stderr: stderr,
                warnings: warnings,
                details: new JsonObject
                {
                    ["rpc"] = callResponse.DeepClone(),
                    ["stderr"] = Clip(stderr)
                });
        }

        return McpExecutionResult.Success(callResponse, stderr, warnings);
    }

    private McpBridgeOptions ResolveOptions()
    {
        var options = _configuration.GetSection("McpBridge").Get<McpBridgeOptions>() ?? new McpBridgeOptions();

        if (string.IsNullOrWhiteSpace(options.PythonExecutable))
        {
            options.PythonExecutable = "python";
        }

        if (string.IsNullOrWhiteSpace(options.ScriptPath))
        {
            options.ScriptPath = Path.Combine("tools", "mcp_adapter", "stockchart_mcp_server.py");
        }

        options.TimeoutSeconds = Math.Clamp(options.TimeoutSeconds, 5, 180);
        return options;
    }

    private string ResolveScriptPath(string scriptPath)
    {
        if (Path.IsPathRooted(scriptPath))
        {
            return scriptPath;
        }

        var localCandidate = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, scriptPath));
        if (System.IO.File.Exists(localCandidate))
        {
            return localCandidate;
        }

        // When the API project is in /StockChart and tools are in repo root /tools,
        // resolve relative path one level above content root.
        var repoRootCandidate = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "..", scriptPath));
        if (System.IO.File.Exists(repoRootCandidate))
        {
            return repoRootCandidate;
        }

        return localCandidate;
    }

    private static JsonObject CreateInitializeRequest()
    {
        return new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"] = InitializeRequestId,
            ["method"] = "initialize",
            ["params"] = new JsonObject
            {
                ["protocolVersion"] = ProtocolVersion,
                ["clientInfo"] = new JsonObject
                {
                    ["name"] = "StockChart.Web.McpBridge",
                    ["version"] = "1.0.0"
                },
                ["capabilities"] = new JsonObject()
            }
        };
    }

    private static JsonObject CreateRpcRequest(int id, string method, JsonNode? parameters)
    {
        return new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"] = id,
            ["method"] = method,
            ["params"] = parameters ?? new JsonObject()
        };
    }

    private static bool IsResponseForId(JsonNode? responseNode, JsonNode? idNode)
    {
        if (responseNode is not JsonObject responseObject || idNode == null)
        {
            return false;
        }

        if (!responseObject.TryGetPropertyValue("id", out var responseIdNode) || responseIdNode == null)
        {
            return false;
        }

        if (idNode is JsonValue expectedValue &&
            responseIdNode is JsonValue actualValue)
        {
            if (expectedValue.TryGetValue<int>(out var expectedInt) &&
                actualValue.TryGetValue<int>(out var actualInt))
            {
                return expectedInt == actualInt;
            }

            if (expectedValue.TryGetValue<string>(out var expectedString) &&
                actualValue.TryGetValue<string>(out var actualString))
            {
                return string.Equals(expectedString, actualString, StringComparison.Ordinal);
            }
        }

        return string.Equals(idNode.ToJsonString(), responseIdNode.ToJsonString(), StringComparison.Ordinal);
    }

    private static List<string> SplitNonEmptyLines(string value)
    {
        return value
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToList();
    }

    private static string SerializeOneLine(JsonNode node)
    {
        return node.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = false
        });
    }

    private static async Task<string> SafeReadAsync(Task<string> readTask)
    {
        try
        {
            return await readTask;
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string Clip(string? value, int maxLength = 8000)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        return value.Length <= maxLength
            ? value
            : value[..maxLength] + "...";
    }

    private static void TryKill(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch
        {
            // no-op
        }
    }

    private static string NormalizeStderr(string? stderr)
    {
        if (string.IsNullOrWhiteSpace(stderr))
        {
            return string.Empty;
        }

        var lines = stderr
            .Split('\n', StringSplitOptions.None)
            .Select(line => line.TrimEnd('\r'))
            .Where(line => !IsIgnorableStderrLine(line))
            .ToList();

        return string.Join('\n', lines).Trim();
    }

    private static bool IsIgnorableStderrLine(string line)
    {
        if (string.IsNullOrWhiteSpace(line))
        {
            return true;
        }

        var trimmed = line.Trim();
        return trimmed.StartsWith("[StockChart.MCP] starting;", StringComparison.OrdinalIgnoreCase) ||
               trimmed.StartsWith("StockChart.MCP starting;", StringComparison.OrdinalIgnoreCase);
    }

    public sealed class McpToolCallRequest
    {
        public string? Tool { get; set; }
        public JsonNode? Arguments { get; set; }
    }

    public sealed class McpRpcRequest
    {
        public string? Method { get; set; }
        public JsonNode? Params { get; set; }
        public int? RequestId { get; set; }
    }

    public sealed class McpChatRequest
    {
        public string? Message { get; set; }
        public List<McpChatHistoryItem>? History { get; set; }
    }

    public sealed class McpChatHistoryItem
    {
        public string? Role { get; set; }
        public string? Content { get; set; }
    }

    public sealed class McpChatResponse
    {
        public bool IsError { get; set; }
        public string Provider { get; set; } = LocalProviderName;
        public string? Model { get; set; }
        public string Answer { get; set; } = string.Empty;
        public string? ExecutedTool { get; set; }
        public JsonNode? Arguments { get; set; }
        public JsonNode? Data { get; set; }
        public string? Stderr { get; set; }
        public List<string>? Warnings { get; set; }
        public List<string>? Suggestions { get; set; }
    }

    private sealed class McpToolExecutionView
    {
        public bool IsError { get; set; }
        public JsonNode Payload { get; set; } = new JsonObject();
        public JsonNode Rpc { get; set; } = new JsonObject();
        public JsonObject? BridgeError { get; set; }
        public string Stderr { get; set; } = string.Empty;
        public List<string> Warnings { get; set; } = [];
    }

    private sealed class McpBridgeOptions
    {
        public string PythonExecutable { get; set; } = "python";
        public string ScriptPath { get; set; } = Path.Combine("tools", "mcp_adapter", "stockchart_mcp_server.py");
        public string? StockChartBaseUrl { get; set; }
        public int TimeoutSeconds { get; set; } = 45;
        public bool InsecureTls { get; set; }
        public string? DefaultCandlesProfile { get; set; }
        public string? DefaultListProfile { get; set; }
    }

    private sealed class McpProviderOptions
    {
        public string Provider { get; set; } = LocalProviderName;
        public McpOpenAiOptions OpenAi { get; set; } = new();
    }

    private sealed class McpOpenAiOptions
    {
        public bool Enabled { get; set; } = true;
        public string? ApiKey { get; set; }
        public string ApiKeyEnvVar { get; set; } = "OPENAI_API_KEY";
        public string BaseUrl { get; set; } = "https://api.openai.com/v1";
        public string Model { get; set; } = "gpt-4o-mini";
        public string? Organization { get; set; }
        public string? Project { get; set; }
        public int TimeoutSeconds { get; set; } = 90;
        public double Temperature { get; set; } = 0.2;
        public int MaxCompletionTokens { get; set; } = 1200;
        public int MaxToolIterations { get; set; } = 4;
        public string? SystemPrompt { get; set; }
    }

    private sealed class OpenAiChatResult
    {
        public bool IsSuccess { get; private init; }
        public JsonObject? AssistantMessage { get; private init; }
        public JsonNode? RawResponse { get; private init; }
        public JsonObject? Error { get; private init; }

        public static OpenAiChatResult Success(JsonObject assistantMessage, JsonNode? rawResponse)
        {
            return new OpenAiChatResult
            {
                IsSuccess = true,
                AssistantMessage = assistantMessage,
                RawResponse = rawResponse
            };
        }

        public static OpenAiChatResult Fail(string message, JsonObject? details = null)
        {
            return new OpenAiChatResult
            {
                IsSuccess = false,
                Error = new JsonObject
                {
                    ["message"] = message,
                    ["details"] = details ?? new JsonObject()
                }
            };
        }
    }

    private sealed class McpExecutionResult
    {
        public JsonNode? CallResponse { get; private init; }
        public JsonObject? Error { get; private init; }
        public string Stderr { get; private init; } = string.Empty;
        public List<string> Warnings { get; private init; } = [];

        public static McpExecutionResult Success(JsonNode callResponse, string stderr, IEnumerable<string>? warnings = null)
        {
            return new McpExecutionResult
            {
                CallResponse = callResponse,
                Stderr = stderr ?? string.Empty,
                Warnings = warnings?.ToList() ?? []
            };
        }

        public static McpExecutionResult Fail(
            string message,
            JsonObject? details = null,
            string? stderr = null,
            IEnumerable<string>? warnings = null)
        {
            var error = new JsonObject
            {
                ["message"] = message,
                ["details"] = details ?? new JsonObject()
            };

            if (warnings != null)
            {
                var warningsArray = new JsonArray();
                foreach (var warning in warnings)
                {
                    warningsArray.Add(warning);
                }

                error["warnings"] = warningsArray;
            }

            return new McpExecutionResult
            {
                Error = error,
                Stderr = stderr ?? string.Empty,
                Warnings = warnings?.ToList() ?? []
            };
        }
    }
}
