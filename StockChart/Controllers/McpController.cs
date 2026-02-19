using System.Diagnostics;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;

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
    private const string OpenAiApiModeLegacy = "chat_completions_legacy";
    private const string OpenAiApiModeResponsesCustomTools = "responses_custom_tools";
    private const string OpenAiApiModeResponsesNativeMcp = "responses_native_mcp";
    private const string DefaultConversationTitle = "Новый диалог";
    private const int ConversationHistoryLimit = 30;
    private const int OpenAiToolPayloadArrayLimit = 24;
    private const int OpenAiToolPayloadObjectLimit = 40;
    private const int OpenAiToolPayloadStringLimit = 600;
    private const int OpenAiToolPayloadDepthLimit = 6;
    private const string DefaultOpenAiSystemPrompt =
        "Ты ассистент MCP-консоли StockChart. Используй доступные tools для получения данных. " +
        "Если вопрос требует фактов и чисел, сначала делай tool calls, затем формируй ответ. " +
        "Если tool вернул VALIDATION_ERROR, исправь аргументы и повтори вызов. " +
        "Для marketCode используй числовой код (для акций MOEX обычно 0). " +
        "Отвечай кратко и по делу на русском языке. " +
        "Если пользователь просит сделать расчет/сводку/таблицу, выполняй это сразу в текущем ответе. " +
        "Если нужна визуализация сравнения/структуры, добавляй markdown chart-блоки `bar`/`pie`. " +
        "Если пользователь просит свечной график, добавляй markdown chart-блок `candlestick` с полями ticker, period, rperiod, startDate/endDate и mode='candles'; не добавляй внешние URL. " +
        "Не повторяй уточняющие вопросы по кругу.";
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
    private static readonly Regex ProceedSignalRegex = new(
        "\\b(да|ок|окей|подтверждаю|подтверждаем|вперед|впер[её]д|делай|сделай|запускай|продолжай)\\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<McpController> _logger;
    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IUsersRepository _usersRepository;

    public McpController(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IHttpClientFactory httpClientFactory,
        ILogger<McpController> logger,
        ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        IUsersRepository usersRepository)
    {
        _configuration = configuration;
        _environment = environment;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _dbContext = dbContext;
        _userManager = userManager;
        _usersRepository = usersRepository;
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
                apiMode = openAi.ApiMode,
                useConversationsApi = openAi.UseConversationsApi,
                reasoningEffort = openAi.ReasoningEffort,
                hasApiKey,
                apiKeyEnvVar = openAi.ApiKeyEnvVar
            }
        });
    }

    [AllowAnonymous]
    [HttpGet("~/mcp")]
    public IActionResult GetHttpMcpServerInfo()
    {
        return Ok(new
        {
            name = "StockChart.McpServer",
            protocolVersion = ProtocolVersion,
            status = "ok"
        });
    }

    [AllowAnonymous]
    [HttpPost("~/mcp")]
    public async Task<IActionResult> HandleHttpMcpRequest([FromBody] JsonNode? rpcRequest, CancellationToken cancellationToken)
    {
        if (!TryAuthorizeHttpMcpRequest(out var authError))
        {
            return authError!;
        }

        if (rpcRequest is not JsonObject requestObject)
        {
            return CreateJsonRpcHttpResponse(
                CreateJsonRpcErrorResponse(null, -32600, "Invalid Request", new JsonObject
                {
                    ["message"] = "Body must be a JSON-RPC object."
                }));
        }

        var method = requestObject["method"]?.GetValue<string>()?.Trim();
        var idNode = requestObject["id"]?.DeepClone();
        var parameters = requestObject["params"]?.DeepClone() ?? new JsonObject();

        if (string.IsNullOrWhiteSpace(method))
        {
            return CreateJsonRpcHttpResponse(
                CreateJsonRpcErrorResponse(idNode, -32600, "Invalid Request", new JsonObject
                {
                    ["message"] = "method is required."
                }));
        }

        if (string.Equals(method, "notifications/initialized", StringComparison.OrdinalIgnoreCase))
        {
            return NoContent();
        }

        if (string.Equals(method, "ping", StringComparison.OrdinalIgnoreCase))
        {
            return CreateJsonRpcHttpResponse(CreateJsonRpcResultResponse(idNode, new JsonObject
            {
                ["ok"] = true
            }));
        }

        if (string.Equals(method, "initialize", StringComparison.OrdinalIgnoreCase))
        {
            var initResult = new JsonObject
            {
                ["protocolVersion"] = ProtocolVersion,
                ["serverInfo"] = new JsonObject
                {
                    ["name"] = "StockChart.McpServer",
                    ["version"] = "1.0.0"
                },
                ["capabilities"] = new JsonObject
                {
                    ["tools"] = new JsonObject
                    {
                        ["listChanged"] = false
                    },
                    ["resources"] = new JsonObject
                    {
                        ["listChanged"] = false
                    }
                },
                ["instructions"] =
                    "Expose StockChart economic/fundamental tools via MCP over HTTP. " +
                    "Use tools/list and tools/call."
            };

            return CreateJsonRpcHttpResponse(CreateJsonRpcResultResponse(idNode, initResult));
        }

        if (!IsSupportedHttpMcpMethod(method))
        {
            return CreateJsonRpcHttpResponse(
                CreateJsonRpcErrorResponse(idNode, -32601, "Method not found", new JsonObject
                {
                    ["method"] = method
                }));
        }

        var proxiedRequest = new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"] = idNode?.DeepClone() ?? JsonValue.Create(Guid.NewGuid().ToString("N")),
            ["method"] = method,
            ["params"] = parameters
        };

        var execution = await ExecuteAsync(proxiedRequest, cancellationToken);
        if (execution.Error != null)
        {
            return CreateJsonRpcHttpResponse(
                CreateJsonRpcErrorResponse(idNode, -32000, "MCP bridge execution failed.", new JsonObject
                {
                    ["error"] = execution.Error.DeepClone(),
                    ["stderr"] = Clip(execution.Stderr, 2000),
                    ["warnings"] = ToJsonArray(execution.Warnings)
                }));
        }

        if (execution.CallResponse is JsonObject responseObject)
        {
            return CreateJsonRpcHttpResponse(responseObject);
        }

        return CreateJsonRpcHttpResponse(
            CreateJsonRpcErrorResponse(idNode, -32000, "MCP bridge returned invalid response.", new JsonObject
            {
                ["response"] = execution.CallResponse?.DeepClone()
            }));
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken cancellationToken)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized(new { error = "user is not authenticated." });
        }

        var conversations = await _dbContext.McpConversations
            .AsNoTracking()
            .Where(x => x.UserId == user.Id)
            .OrderByDescending(x => x.UpdatedAt)
            .Select(x => new McpConversationSummary
            {
                Id = x.Id,
                Title = x.Title,
                LastMessagePreview = x.LastMessagePreview,
                LastMessageAt = x.LastMessageAt,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,
                MessageCount = x.Messages.Count
            })
            .ToListAsync(cancellationToken);

        return Ok(conversations);
    }

    [HttpGet("conversations/{conversationId:guid}")]
    public async Task<IActionResult> GetConversation(Guid conversationId, CancellationToken cancellationToken)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized(new { error = "user is not authenticated." });
        }

        var conversation = await _dbContext.McpConversations
            .AsNoTracking()
            .Where(x => x.Id == conversationId && x.UserId == user.Id)
            .Select(x => new McpConversationDetails
            {
                Id = x.Id,
                Title = x.Title,
                LastMessagePreview = x.LastMessagePreview,
                LastMessageAt = x.LastMessageAt,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,
                ProviderApiMode = x.ProviderApiMode,
                ProviderConversationId = x.ProviderConversationId,
                ProviderLastResponseId = x.ProviderLastResponseId
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (conversation == null)
        {
            return NotFound(new { error = "conversation was not found." });
        }

        var messageRows = await _dbContext.McpConversationMessages
            .AsNoTracking()
            .Where(x => x.ConversationId == conversationId)
            .OrderBy(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.Role,
                x.Content,
                x.Provider,
                x.Model,
                x.ProviderMessageId,
                x.IsError,
                x.DataJson,
                x.TraceJson,
                x.SuggestionsJson,
                x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        conversation.Messages = messageRows.Select(x => new McpConversationMessageView
        {
            Id = x.Id,
            Role = x.Role,
            Text = x.Content,
            Provider = x.Provider,
            Model = x.Model,
            ProviderMessageId = x.ProviderMessageId,
            IsError = x.IsError,
            Data = BuildStoredMessageDataNode(x.DataJson, x.TraceJson),
            Suggestions = ParseStringList(x.SuggestionsJson),
            Timestamp = x.CreatedAt
        }).ToList();
        return Ok(conversation);
    }

    [HttpPost("conversations")]
    public async Task<IActionResult> CreateConversation(
        [FromBody] McpCreateConversationRequest? request,
        CancellationToken cancellationToken)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return Unauthorized(new { error = "user is not authenticated." });
        }

        var now = DateTime.UtcNow;
        var conversation = new McpConversation
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Title = BuildConversationTitle(request?.Title),
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.McpConversations.Add(conversation);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new McpConversationSummary
        {
            Id = conversation.Id,
            Title = conversation.Title,
            LastMessagePreview = conversation.LastMessagePreview,
            LastMessageAt = conversation.LastMessageAt,
            CreatedAt = conversation.CreatedAt,
            UpdatedAt = conversation.UpdatedAt,
            MessageCount = 0
        });
    }

    [HttpPost("tool-call")]
    public async Task<IActionResult> ToolCall([FromBody] McpToolCallRequest request, CancellationToken cancellationToken)
    {
        var access = await EnsureMcpAccessAsync();
        if (access.Error != null)
        {
            return access.Error;
        }

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
        var access = await EnsureMcpAccessAsync();
        if (access.Error != null)
        {
            return access.Error;
        }

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
        var access = await EnsureMcpAccessAsync();
        if (access.Error != null)
        {
            return access.Error;
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { error = "message is required." });
        }

        var user = access.User!;
        var userMessage = request.Message.Trim();
        var conversation = await ResolveConversationAsync(
            user.Id,
            request.ConversationId,
            userMessage,
            cancellationToken);

        if (conversation == null)
        {
            return NotFound(new { error = "conversation was not found." });
        }

        request.ProviderConversationId = conversation.ProviderConversationId;
        request.ProviderLastResponseId = conversation.ProviderLastResponseId;
        request.ProviderApiMode = conversation.ProviderApiMode;
        request.History = await BuildConversationHistoryAsync(conversation.Id, cancellationToken);
        var response = await HandleChatAsync(request, cancellationToken);
        var providerOptions = ResolveProviderOptions();
        var activeApiMode = NormalizeOpenAiApiMode(providerOptions.OpenAi.ApiMode);

        var now = DateTime.UtcNow;
        _dbContext.McpConversationMessages.Add(new McpConversationMessage
        {
            ConversationId = conversation.Id,
            Role = "user",
            Content = userMessage,
            CreatedAt = now
        });

        _dbContext.McpConversationMessages.Add(new McpConversationMessage
        {
            ConversationId = conversation.Id,
            Role = response.IsError ? "error" : "assistant",
            Content = response.Answer,
            Provider = response.Provider,
            Model = response.Model,
            ProviderMessageId = response.ProviderRunId,
            IsError = response.IsError,
            DataJson = SerializeJsonNode(BuildStoredMessageData(response)),
            TraceJson = SerializeJsonNode(response.Trace),
            SuggestionsJson = SerializeStringList(response.Suggestions),
            CreatedAt = now
        });

        conversation.UpdatedAt = now;
        conversation.LastMessageAt = now;
        conversation.LastMessagePreview = BuildConversationPreview(response.Answer);
        if (string.Equals(response.Provider, OpenAiProviderName, StringComparison.OrdinalIgnoreCase))
        {
            conversation.ProviderApiMode = activeApiMode;
            if (!string.IsNullOrWhiteSpace(response.ProviderConversationId))
            {
                conversation.ProviderConversationId = response.ProviderConversationId;
            }

            if (!string.IsNullOrWhiteSpace(response.ProviderRunId))
            {
                conversation.ProviderLastResponseId = response.ProviderRunId;
            }
        }

        var providerStateApiMode = string.Equals(response.Provider, OpenAiProviderName, StringComparison.OrdinalIgnoreCase)
            ? (conversation.ProviderApiMode ?? activeApiMode)
            : null;
        conversation.ProviderStateJson = SerializeJsonNode(
            BuildConversationProviderState(response, providerStateApiMode));

        if (IsDefaultConversationTitle(conversation.Title))
        {
            conversation.Title = BuildConversationTitle(userMessage);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        response.ConversationId = conversation.Id;
        response.ConversationTitle = conversation.Title;
        return Ok(response);
    }

    private async Task<(ApplicationUser? User, IActionResult? Error)> EnsureMcpAccessAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return (null, Unauthorized(new { error = "user is not authenticated." }));
        }

        var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");
        if (isAdmin)
        {
            return (user, null);
        }

        var hasActiveSubscription = await _usersRepository.UserHasActiveSubscription(user);
        if (hasActiveSubscription)
        {
            return (user, null);
        }

        return (null, StatusCode(StatusCodes.Status403Forbidden, new
        {
            code = "subscription_required",
            error = "Active subscription is required to use MCP tools and chat.",
            paymentUrl = "/Payment"
        }));
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

        var candlestickResponse = TryHandleCandlestickRequest(message, lower);
        if (candlestickResponse != null)
        {
            return candlestickResponse;
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
            Answer = "Понимаю команды `/help`, `/tools`, `/tool ...`, `/rpc ...` и простые запросы вроде `дивиденды SBER`, `свечной график SBER`.",
            Suggestions =
            [
                "/help",
                "/tools",
                "покажи рынки",
                "дивиденды SBER",
                "барометр SBER GAZP",
                "свечной график SBER"
            ]
        };
    }

    private async Task<McpConversation?> ResolveConversationAsync(
        Guid userId,
        Guid? conversationId,
        string initialMessage,
        CancellationToken cancellationToken)
    {
        if (conversationId.HasValue)
        {
            return await _dbContext.McpConversations
                .SingleOrDefaultAsync(
                    x => x.Id == conversationId.Value && x.UserId == userId,
                    cancellationToken);
        }

        var now = DateTime.UtcNow;
        var conversation = new McpConversation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = BuildConversationTitle(initialMessage),
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.McpConversations.Add(conversation);
        return conversation;
    }

    private async Task<List<McpChatHistoryItem>> BuildConversationHistoryAsync(
        Guid conversationId,
        CancellationToken cancellationToken)
    {
        var rows = await _dbContext.McpConversationMessages
            .AsNoTracking()
            .Where(x => x.ConversationId == conversationId)
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Take(ConversationHistoryLimit)
            .OrderBy(x => x.CreatedAt)
            .ThenBy(x => x.Id)
            .Select(x => new
            {
                x.Role,
                x.Content
            })
            .ToListAsync(cancellationToken);

        var result = new List<McpChatHistoryItem>(rows.Count);
        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.Content))
            {
                continue;
            }

            var role = row.Role;
            if (string.Equals(role, "error", StringComparison.OrdinalIgnoreCase))
            {
                role = "assistant";
            }

            result.Add(new McpChatHistoryItem
            {
                Role = role,
                Content = row.Content
            });
        }

        return result;
    }

    private static JsonNode? BuildStoredMessageData(McpChatResponse response)
    {
        var payload = new JsonObject();
        var hasPayload = false;

        if (!string.IsNullOrWhiteSpace(response.ExecutedTool))
        {
            payload["executedTool"] = response.ExecutedTool;
            hasPayload = true;
        }

        if (response.Arguments != null)
        {
            payload["arguments"] = response.Arguments.DeepClone();
            hasPayload = true;
        }

        if (response.Data != null)
        {
            payload["data"] = response.Data.DeepClone();
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.ProviderRunId))
        {
            payload["providerRunId"] = response.ProviderRunId;
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.ProviderConversationId))
        {
            payload["providerConversationId"] = response.ProviderConversationId;
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.OrchestratorPhase))
        {
            payload["orchestratorPhase"] = response.OrchestratorPhase;
            hasPayload = true;
        }

        if (response.Trace != null)
        {
            payload["trace"] = response.Trace.DeepClone();
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.Stderr))
        {
            payload["stderr"] = response.Stderr;
            hasPayload = true;
        }

        if (response.Warnings is { Count: > 0 })
        {
            var warnings = new JsonArray();
            foreach (var warning in response.Warnings)
            {
                warnings.Add(warning);
            }

            payload["warnings"] = warnings;
            hasPayload = true;
        }

        if (response.OrchestratorWarnings is { Count: > 0 })
        {
            var orchestratorWarnings = new JsonArray();
            foreach (var warning in response.OrchestratorWarnings.Where(x => !string.IsNullOrWhiteSpace(x)))
            {
                orchestratorWarnings.Add(warning);
            }

            if (orchestratorWarnings.Count > 0)
            {
                payload["orchestratorWarnings"] = orchestratorWarnings;
                hasPayload = true;
            }
        }

        return hasPayload ? payload : null;
    }

    private static JsonNode? BuildConversationProviderState(McpChatResponse response, string? apiMode)
    {
        var payload = new JsonObject();
        var hasPayload = false;

        if (!string.IsNullOrWhiteSpace(apiMode))
        {
            payload["apiMode"] = apiMode;
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.Provider))
        {
            payload["provider"] = response.Provider;
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.Model))
        {
            payload["model"] = response.Model;
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.ProviderConversationId))
        {
            payload["providerConversationId"] = response.ProviderConversationId;
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.ProviderRunId))
        {
            payload["providerRunId"] = response.ProviderRunId;
            hasPayload = true;
        }

        if (!string.IsNullOrWhiteSpace(response.OrchestratorPhase))
        {
            payload["orchestratorPhase"] = response.OrchestratorPhase;
            hasPayload = true;
        }

        if (response.OrchestratorWarnings is { Count: > 0 })
        {
            var warnings = new JsonArray();
            foreach (var warning in response.OrchestratorWarnings.Where(x => !string.IsNullOrWhiteSpace(x)))
            {
                warnings.Add(warning);
            }

            if (warnings.Count > 0)
            {
                payload["orchestratorWarnings"] = warnings;
                hasPayload = true;
            }
        }

        payload["updatedAtUtc"] = DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture);
        hasPayload = true;

        return hasPayload ? payload : null;
    }

    private static string? SerializeJsonNode(JsonNode? node)
    {
        if (node == null)
        {
            return null;
        }

        return node.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = false
        });
    }

    private static JsonNode? ParseJsonNode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        try
        {
            return JsonNode.Parse(value);
        }
        catch
        {
            return new JsonObject
            {
                ["raw"] = Clip(value, 12000),
                ["parseError"] = "invalid_json"
            };
        }
    }

    private static JsonNode? BuildStoredMessageDataNode(string? dataJson, string? traceJson)
    {
        var parsedData = ParseJsonNode(dataJson);
        if (parsedData != null)
        {
            return parsedData;
        }

        var parsedTrace = ParseJsonNode(traceJson);
        if (parsedTrace == null)
        {
            return null;
        }

        return new JsonObject
        {
            ["trace"] = parsedTrace
        };
    }

    private static string? SerializeStringList(List<string>? values)
    {
        if (values == null || values.Count == 0)
        {
            return null;
        }

        var array = new JsonArray();
        foreach (var value in values.Where(x => !string.IsNullOrWhiteSpace(x)))
        {
            array.Add(value);
        }

        return array.Count == 0
            ? null
            : array.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
    }

    private static List<string>? ParseStringList(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        try
        {
            var node = JsonNode.Parse(value) as JsonArray;
            if (node == null)
            {
                return null;
            }

            return node
                .Select(x => x?.GetValue<string>()?.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!)
                .ToList();
        }
        catch
        {
            return null;
        }
    }

    private static bool IsDefaultConversationTitle(string? title)
    {
        return string.IsNullOrWhiteSpace(title) ||
               string.Equals(title, DefaultConversationTitle, StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildConversationTitle(string? rawTitle)
    {
        if (string.IsNullOrWhiteSpace(rawTitle))
        {
            return DefaultConversationTitle;
        }

        var normalized = Regex.Replace(rawTitle.Trim(), "\\s+", " ");
        if (normalized.Length > 120)
        {
            normalized = normalized[..120].TrimEnd() + "...";
        }

        return string.IsNullOrWhiteSpace(normalized)
            ? DefaultConversationTitle
            : normalized;
    }

    private static string BuildConversationPreview(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var normalized = Regex.Replace(text.Trim(), "\\s+", " ");
        return normalized.Length <= 240
            ? normalized
            : normalized[..240].TrimEnd() + "...";
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

        var apiMode = NormalizeOpenAiApiMode(openAi.ApiMode);
        if (!string.Equals(apiMode, OpenAiApiModeLegacy, StringComparison.OrdinalIgnoreCase))
        {
            return await TryHandleOpenAiResponsesChatAsync(
                request,
                message,
                apiKey,
                openAi,
                apiMode,
                cancellationToken);
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

        var openAiTools = BuildOpenAiTools(toolsExecution.CallResponse, useResponsesFormat: false);
        var openAiMessages = BuildOpenAiMessages(request, message, openAi);
        var toolTrace = new JsonArray();
        var openAiTrace = new JsonArray();
        var warnings = new List<string>();

        if (toolsExecution.Warnings.Count > 0)
        {
            warnings.AddRange(toolsExecution.Warnings);
        }

        var noTextContinuationAttempts = 0;
        var clarificationLoopAttempts = 0;

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
                openAiTrace.Add(new JsonObject
                {
                    ["phase"] = "iteration",
                    ["iteration"] = iteration + 1,
                    ["status"] = "error",
                    ["error"] = completion.Error?.DeepClone() ?? new JsonObject()
                });

                return new McpChatResponse
                {
                    IsError = true,
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = "Ошибка при обращении к OpenAI.",
                    Data = completion.Error,
                    Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                    Warnings = warnings.Count > 0 ? warnings : null
                };
            }

            var assistantMessage = completion.AssistantMessage;
            if (assistantMessage == null)
            {
                openAiTrace.Add(new JsonObject
                {
                    ["phase"] = "iteration",
                    ["iteration"] = iteration + 1,
                    ["status"] = "error",
                    ["message"] = "OpenAI returned no assistant message.",
                    ["finishReason"] = completion.FinishReason ?? string.Empty
                });

                return new McpChatResponse
                {
                    IsError = true,
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = "OpenAI вернул ответ без `choices[0].message`.",
                    Data = completion.RawResponse,
                    Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                    Warnings = warnings.Count > 0 ? warnings : null
                };
            }

            openAiMessages.Add(assistantMessage.DeepClone());

            var toolCalls = ExtractOpenAiToolCalls(assistantMessage);
            var assistantTextPreview = Clip(ExtractOpenAiContent(assistantMessage, completion.RawResponse), 700);
            var iterationTrace = new JsonObject
            {
                ["phase"] = "iteration",
                ["iteration"] = iteration + 1,
                ["status"] = "ok",
                ["finishReason"] = completion.FinishReason ?? string.Empty,
                ["toolCallCount"] = toolCalls.Count,
                ["tools"] = BuildOpenAiToolNames(toolCalls),
                ["assistantTextPreview"] = assistantTextPreview
            };

            if (completion.RawResponse?["usage"] != null)
            {
                iterationTrace["usage"] = completion.RawResponse["usage"]?.DeepClone();
            }

            var iterationToolResults = new JsonArray();
            iterationTrace["toolResults"] = iterationToolResults;
            openAiTrace.Add(iterationTrace);

            if (toolCalls.Count == 0)
            {
                var answer = ExtractOpenAiContent(assistantMessage, completion.RawResponse);
                if (!string.IsNullOrWhiteSpace(answer) &&
                    ShouldBypassClarificationLoop(
                        message,
                        answer,
                        request.History,
                        clarificationLoopAttempts,
                        iteration,
                        openAi.MaxToolIterations))
                {
                    clarificationLoopAttempts++;
                    warnings.Add("OpenAI зациклился на уточнениях. Продолжаю без повторных вопросов.");
                    openAiMessages.Add(new JsonObject
                    {
                        ["role"] = "system",
                        ["content"] =
                            "Пользователь уже подтвердил выполнение. " +
                            "Не задавай больше уточняющих вопросов (формат, подтверждение, перечень полей). " +
                            "Выполни необходимые tool calls прямо сейчас и верни финальный ответ."
                    });
                    continue;
                }

                if (string.IsNullOrWhiteSpace(answer))
                {
                    var finishReason = completion.FinishReason?.Trim();
                    if (string.Equals(finishReason, "length", StringComparison.OrdinalIgnoreCase) &&
                        iteration + 1 < openAi.MaxToolIterations)
                    {
                        noTextContinuationAttempts++;
                        warnings.Add("OpenAI обрезал ответ по лимиту токенов. Продолжаю цепочку.");
                        openAiMessages.Add(new JsonObject
                        {
                            ["role"] = "system",
                            ["content"] =
                                "Предыдущий ответ был прерван из-за лимита токенов. " +
                                "Продолжи с того же места и при необходимости вызывай tools."
                        });
                        continue;
                    }

                    if (toolTrace.Count > 0 &&
                        noTextContinuationAttempts < 2 &&
                        iteration + 1 < openAi.MaxToolIterations)
                    {
                        noTextContinuationAttempts++;
                        warnings.Add("OpenAI вернул assistant-сообщение без текста. Запрашиваю еще один проход с tools.");
                        openAiMessages.Add(new JsonObject
                        {
                            ["role"] = "system",
                            ["content"] =
                                "Ты еще не выдал итоговый ответ пользователю. " +
                                "Если данных недостаточно, сначала вызови нужные tools, затем обязательно дай финальный текст. " +
                                "Не проси подтверждений и не задавай встречных вопросов."
                        });
                        continue;
                    }

                    warnings.Add("OpenAI вернул assistant-сообщение без текста. Выполняю финализацию без новых tools.");
                    answer = await TryFinalizeOpenAiAnswerWithoutToolsAsync(
                        apiKey,
                        openAi,
                        openAiMessages,
                        openAiTools,
                        cancellationToken,
                        openAiTrace,
                        "fallback_no_text");
                }

                if (string.IsNullOrWhiteSpace(answer))
                {
                    var fallback = TryBuildToolDataFallback(toolTrace)
                                   ?? TryBuildToolErrorFallback(toolTrace);
                    if (!string.IsNullOrWhiteSpace(fallback))
                    {
                        answer = fallback;
                    }
                    else
                    {
                        return new McpChatResponse
                        {
                            IsError = true,
                            Provider = OpenAiProviderName,
                            Model = openAi.Model,
                            Answer = "OpenAI вернул пустой ответ.",
                            Data = new JsonObject
                            {
                                ["code"] = "openai_empty_final"
                            },
                            Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                            Warnings = warnings.Count > 0 ? warnings : null
                        };
                    }
                }

                return new McpChatResponse
                {
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = answer,
                    Data = toolTrace.Count > 0 ? toolTrace : null,
                    Trace = openAiTrace.Count > 0 ? openAiTrace : null,
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
                    iterationToolResults.Add(new JsonObject
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
                    iterationToolResults.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["isError"] = true,
                        ["error"] = "arguments JSON parse error"
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
                    iterationToolResults.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["isError"] = true,
                        ["arguments"] = argumentsObject.DeepClone(),
                        ["error"] = toolExecution.BridgeError["message"]?.GetValue<string>() ?? "bridge_error"
                    });
                }
                else
                {
                    modelPayload = new JsonObject
                    {
                        ["isError"] = toolExecution.IsError,
                        ["data"] = CompactToolPayloadForModel(toolExecution.Payload) ?? new JsonObject()
                    };

                    toolTrace.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["arguments"] = argumentsObject.DeepClone(),
                        ["isError"] = toolExecution.IsError,
                        ["data"] = toolExecution.Payload.DeepClone()
                    });

                    iterationToolResults.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["isError"] = toolExecution.IsError,
                        ["arguments"] = argumentsObject.DeepClone(),
                        ["error"] = toolExecution.IsError
                            ? (toolExecution.Payload["error"]?["message"]?.GetValue<string>() ?? "tool_error")
                            : null
                    });
                }

                openAiMessages.Add(CreateOpenAiToolMessage(callId, modelPayload));
            }
        }

        warnings.Add($"Достигнут лимит tool-итераций OpenAI ({openAi.MaxToolIterations}).");

        var finalizedAnswer = await TryFinalizeOpenAiAnswerWithoutToolsAsync(
            apiKey,
            openAi,
            openAiMessages,
            openAiTools,
            cancellationToken,
            openAiTrace,
            "limit_finalize");

        if (!string.IsNullOrWhiteSpace(finalizedAnswer))
        {
            return new McpChatResponse
            {
                Provider = OpenAiProviderName,
                Model = openAi.Model,
                Answer = finalizedAnswer,
                Data = toolTrace.Count > 0 ? toolTrace : null,
                Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                Warnings = warnings.Count > 0 ? warnings : null
            };
        }

        var fallbackAnswer = TryBuildToolDataFallback(toolTrace)
                             ?? TryBuildToolErrorFallback(toolTrace);
        if (!string.IsNullOrWhiteSpace(fallbackAnswer))
        {
            return new McpChatResponse
            {
                Provider = OpenAiProviderName,
                Model = openAi.Model,
                Answer = fallbackAnswer,
                Data = toolTrace.Count > 0 ? toolTrace : null,
                Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                Warnings = warnings.Count > 0 ? warnings : null
            };
        }

        return new McpChatResponse
        {
            IsError = true,
            Provider = OpenAiProviderName,
            Model = openAi.Model,
            Answer = $"Достигнут лимит tool-итераций OpenAI ({openAi.MaxToolIterations}).",
            Data = toolTrace.Count > 0 ? toolTrace : null,
            Trace = openAiTrace.Count > 0 ? openAiTrace : null,
            Warnings = warnings.Count > 0 ? warnings : null
        };
    }

    private async Task<string?> TryFinalizeOpenAiAnswerWithoutToolsAsync(
        string apiKey,
        McpOpenAiOptions options,
        JsonArray messages,
        JsonArray tools,
        CancellationToken cancellationToken,
        JsonArray? openAiTrace = null,
        string phase = "finalize_no_tools")
    {
        var finalizeOptions = CloneOpenAiOptions(options);
        finalizeOptions.MaxCompletionTokens = Math.Clamp(Math.Max(options.MaxCompletionTokens, 3000), 64, 8192);

        var finalMessages = new JsonArray();
        var startIndex = Math.Max(0, messages.Count - 40);
        for (var i = startIndex; i < messages.Count; i++)
        {
            finalMessages.Add(messages[i]?.DeepClone());
        }

        finalMessages.Add(new JsonObject
        {
            ["role"] = "system",
            ["content"] =
                "Больше не вызывай tools. Дай финальный ответ по уже полученным данным в этом сообщении. " +
                "Не задавай встречных вопросов и не проси подтверждений. " +
                "Если формат явно не указан, для числовых данных используй markdown-таблицу и затем короткий вывод. " +
                "Если уместна визуализация, используй markdown chart-блоки `bar`/`pie`; для свечного графика — `candlestick` с внутренним маршрутом сервиса (без внешних URL)."
        });

        var completion = await CallOpenAiChatCompletionAsync(
            apiKey,
            finalizeOptions,
            finalMessages,
            tools,
            cancellationToken,
            toolChoice: tools.Count > 0 ? "none" : null);

        if (openAiTrace != null)
        {
            var traceNode = new JsonObject
            {
                ["phase"] = phase,
                ["status"] = completion.IsSuccess ? "ok" : "error",
                ["finishReason"] = completion.FinishReason ?? string.Empty
            };

            if (completion.Error != null)
            {
                traceNode["error"] = completion.Error.DeepClone();
            }

            if (completion.RawResponse?["usage"] != null)
            {
                traceNode["usage"] = completion.RawResponse["usage"]?.DeepClone();
            }

            var preview = completion.AssistantMessage == null
                ? string.Empty
                : Clip(ExtractOpenAiContent(completion.AssistantMessage, completion.RawResponse), 700);

            if (!string.IsNullOrWhiteSpace(preview))
            {
                traceNode["assistantTextPreview"] = preview;
            }

            openAiTrace.Add(traceNode);
        }

        if (!completion.IsSuccess || completion.AssistantMessage == null)
        {
            return null;
        }

        var answer = ExtractOpenAiContent(completion.AssistantMessage, completion.RawResponse);
        return string.IsNullOrWhiteSpace(answer) ? null : answer;
    }

    private async Task<McpChatResponse> TryHandleOpenAiResponsesChatAsync(
        McpChatRequest request,
        string message,
        string apiKey,
        McpOpenAiOptions openAi,
        string apiMode,
        CancellationToken cancellationToken)
    {
        var toolTrace = new JsonArray();
        var openAiTrace = new JsonArray();
        var warnings = new List<string>();
        var noTextContinuationAttempts = 0;
        var clarificationLoopAttempts = 0;
        var orchestratorPhase = "planning";
        string? providerRunId = null;
        string? providerConversationId = request.ProviderConversationId;
        string? previousResponseId = request.ProviderLastResponseId;

        var useNativeMcp = string.Equals(apiMode, OpenAiApiModeResponsesNativeMcp, StringComparison.OrdinalIgnoreCase);
        JsonArray openAiTools = new();

        if (useNativeMcp)
        {
            var bridgeOptions = ResolveOptions();
            openAiTools = BuildOpenAiNativeMcpTools(openAi, bridgeOptions, warnings);
            if (openAiTools.Count == 0)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer =
                        "Режим `responses_native_mcp` включен, но не настроен ни один MCP server. " +
                        "Проверьте `McpProvider:OpenAi:NativeMcpServers` и токен доступа к `/mcp`.",
                    Data = new JsonObject
                    {
                        ["code"] = "mcp_server_unreachable",
                        ["apiMode"] = apiMode
                    }
                };
            }
        }

        if (!useNativeMcp)
        {
            openAiTools = new JsonArray();
            var toolsRequest = CreateRpcRequest(CallRequestId, "tools/list", new JsonObject());
            var toolsExecution = await ExecuteAsync(toolsRequest, cancellationToken);
            if (toolsExecution.Error != null)
            {
                return new McpChatResponse
                {
                    IsError = true,
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = "Не удалось получить MCP tools перед обращением к OpenAI Responses.",
                    Data = toolsExecution.Error,
                    Stderr = toolsExecution.Stderr,
                    Warnings = toolsExecution.Warnings
                };
            }

            openAiTools = BuildOpenAiTools(toolsExecution.CallResponse, useResponsesFormat: true);
            if (toolsExecution.Warnings.Count > 0)
            {
                warnings.AddRange(toolsExecution.Warnings);
            }
        }

        var forceNoFollowUps = ShouldForceNoFollowUps(message, request.History);
        JsonNode currentInput = openAi.UseConversationsApi && !string.IsNullOrWhiteSpace(previousResponseId)
            ? CreateOpenAiUserMessageInput(message, forceNoFollowUps)
            : BuildOpenAiMessages(request, message, openAi);

        for (var iteration = 0; iteration < openAi.MaxToolIterations; iteration++)
        {
            orchestratorPhase = "tooling";
            var completion = await CallOpenAiResponsesAsync(
                apiKey,
                openAi,
                currentInput,
                openAiTools,
                cancellationToken,
                previousResponseId,
                providerConversationId);

            if (!completion.IsSuccess)
            {
                if (!string.IsNullOrWhiteSpace(previousResponseId) &&
                    LooksLikeOpenAiPreviousResponseError(completion.Error) &&
                    iteration + 1 < openAi.MaxToolIterations)
                {
                    warnings.Add(
                        "OpenAI отклонил previous_response_id. Сбрасываю provider state и повторяю запрос по локальной истории.");
                    previousResponseId = null;
                    providerConversationId = null;
                    currentInput = BuildOpenAiMessages(request, message, openAi);
                    continue;
                }

                openAiTrace.Add(new JsonObject
                {
                    ["phase"] = "iteration",
                    ["iteration"] = iteration + 1,
                    ["status"] = "error",
                    ["error"] = completion.Error?.DeepClone() ?? new JsonObject()
                });

                return new McpChatResponse
                {
                    IsError = true,
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = "Ошибка при обращении к OpenAI Responses API.",
                    Data = BuildOpenAiProviderErrorPayload(completion.Error),
                    Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                    Warnings = warnings.Count > 0 ? warnings : null,
                    ProviderRunId = providerRunId,
                    ProviderConversationId = providerConversationId,
                    OrchestratorPhase = orchestratorPhase,
                    OrchestratorWarnings = warnings.Count > 0 ? warnings.ToList() : null
                };
            }

            if (!string.IsNullOrWhiteSpace(completion.ResponseId))
            {
                providerRunId = completion.ResponseId;
                previousResponseId = completion.ResponseId;
            }

            if (!string.IsNullOrWhiteSpace(completion.ConversationId))
            {
                providerConversationId = completion.ConversationId;
            }

            var toolCalls = ExtractOpenAiResponseToolCalls(completion.RawResponse);
            var assistantTextPreview = Clip(ExtractOpenAiResponseContent(completion.RawResponse), 700);
            var iterationTrace = new JsonObject
            {
                ["phase"] = "iteration",
                ["iteration"] = iteration + 1,
                ["status"] = "ok",
                ["finishReason"] = completion.FinishReason ?? string.Empty,
                ["toolCallCount"] = toolCalls.Count,
                ["tools"] = BuildOpenAiToolNames(toolCalls),
                ["assistantTextPreview"] = assistantTextPreview,
                ["responseId"] = completion.ResponseId ?? string.Empty
            };

            if (completion.RawResponse?["usage"] != null)
            {
                iterationTrace["usage"] = completion.RawResponse["usage"]?.DeepClone();
            }

            var iterationToolResults = new JsonArray();
            iterationTrace["toolResults"] = iterationToolResults;
            openAiTrace.Add(iterationTrace);

            if (toolCalls.Count == 0)
            {
                var answer = ExtractOpenAiResponseContent(completion.RawResponse);
                if (!string.IsNullOrWhiteSpace(answer) &&
                    ShouldBypassClarificationLoop(
                        message,
                        answer,
                        request.History,
                        clarificationLoopAttempts,
                        iteration,
                        openAi.MaxToolIterations))
                {
                    clarificationLoopAttempts++;
                    warnings.Add("OpenAI зациклился на уточнениях. Продолжаю без повторных вопросов.");
                    currentInput = CreateOpenAiUserMessageInput(
                        "Пользователь уже подтвердил выполнение. " +
                        "Не задавай больше уточняющих вопросов. " +
                        "Выполни нужные действия и верни финальный ответ.");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(answer))
                {
                    var finishReason = completion.FinishReason?.Trim();
                    if (string.Equals(finishReason, "incomplete", StringComparison.OrdinalIgnoreCase) &&
                        iteration + 1 < openAi.MaxToolIterations)
                    {
                        noTextContinuationAttempts++;
                        warnings.Add("OpenAI вернул incomplete output. Продолжаю итерацию.");
                        currentInput = CreateOpenAiUserMessageInput(
                            "Предыдущий ответ был прерван. Продолжи с того же места и при необходимости используй tools.");
                        continue;
                    }

                    if (toolTrace.Count > 0 &&
                        noTextContinuationAttempts < 2 &&
                        iteration + 1 < openAi.MaxToolIterations)
                    {
                        noTextContinuationAttempts++;
                        warnings.Add("OpenAI вернул ответ без текста. Запрашиваю еще один проход с tools.");
                        currentInput = CreateOpenAiUserMessageInput(
                            "Ты еще не выдал итоговый ответ пользователю. " +
                            "Если данных недостаточно, сначала вызови нужные tools, затем обязательно дай финальный текст. " +
                            "Не проси подтверждений и не задавай встречных вопросов.");
                        continue;
                    }

                    warnings.Add("OpenAI вернул ответ без текста. Выполняю финализацию без новых tools.");
                    answer = await TryFinalizeOpenAiAnswerWithoutToolsViaResponsesAsync(
                        apiKey,
                        openAi,
                        previousResponseId,
                        providerConversationId,
                        cancellationToken,
                        openAiTrace,
                        "fallback_no_text");
                }

                if (string.IsNullOrWhiteSpace(answer))
                {
                    answer = TryBuildToolDataFallback(toolTrace)
                             ?? TryBuildToolErrorFallback(toolTrace)
                             ?? "OpenAI вернул пустой ответ.";
                }

                orchestratorPhase = "finalizing";
                return new McpChatResponse
                {
                    Provider = OpenAiProviderName,
                    Model = openAi.Model,
                    Answer = answer,
                    Data = toolTrace.Count > 0 ? toolTrace : null,
                    Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                    Warnings = warnings.Count > 0 ? warnings : null,
                    ProviderRunId = providerRunId,
                    ProviderConversationId = providerConversationId,
                    OrchestratorPhase = orchestratorPhase,
                    OrchestratorWarnings = warnings.Count > 0 ? warnings.ToList() : null
                };
            }

            var toolOutputsForNextResponse = new JsonArray();
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

                    toolOutputsForNextResponse.Add(CreateOpenAiResponseToolOutputItem(callId, payload));
                    toolTrace.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["isError"] = true,
                        ["error"] = "tool_call без function.name"
                    });
                    iterationToolResults.Add(new JsonObject
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

                    toolOutputsForNextResponse.Add(CreateOpenAiResponseToolOutputItem(callId, payload));
                    toolTrace.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["isError"] = true,
                        ["error"] = payload.DeepClone()
                    });
                    iterationToolResults.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["isError"] = true,
                        ["error"] = "arguments JSON parse error"
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
                    iterationToolResults.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["isError"] = true,
                        ["arguments"] = argumentsObject.DeepClone(),
                        ["error"] = toolExecution.BridgeError["message"]?.GetValue<string>() ?? "bridge_error"
                    });
                }
                else
                {
                    modelPayload = new JsonObject
                    {
                        ["isError"] = toolExecution.IsError,
                        ["data"] = CompactToolPayloadForModel(toolExecution.Payload) ?? new JsonObject()
                    };

                    toolTrace.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["arguments"] = argumentsObject.DeepClone(),
                        ["isError"] = toolExecution.IsError,
                        ["data"] = toolExecution.Payload.DeepClone()
                    });

                    iterationToolResults.Add(new JsonObject
                    {
                        ["id"] = callId,
                        ["tool"] = toolName,
                        ["isError"] = toolExecution.IsError,
                        ["arguments"] = argumentsObject.DeepClone(),
                        ["error"] = toolExecution.IsError
                            ? (toolExecution.Payload["error"]?["message"]?.GetValue<string>() ?? "tool_error")
                            : null
                    });
                }

                toolOutputsForNextResponse.Add(CreateOpenAiResponseToolOutputItem(callId, modelPayload));
            }

            currentInput = toolOutputsForNextResponse;
        }

        warnings.Add($"Достигнут лимит tool-итераций OpenAI ({openAi.MaxToolIterations}).");

        var skipFinalize = false;
        if (!string.IsNullOrWhiteSpace(previousResponseId) &&
            HasOpenAiFunctionCallOutputItems(currentInput))
        {
            warnings.Add("Перед финализацией отправляю последние tool output в OpenAI.");
            var flushCompletion = await CallOpenAiResponsesAsync(
                apiKey,
                openAi,
                currentInput,
                new JsonArray(),
                cancellationToken,
                previousResponseId,
                providerConversationId);

            var flushTrace = new JsonObject
            {
                ["phase"] = "limit_flush",
                ["status"] = flushCompletion.IsSuccess ? "ok" : "error",
                ["finishReason"] = flushCompletion.FinishReason ?? string.Empty,
                ["responseId"] = flushCompletion.ResponseId ?? string.Empty
            };

            if (flushCompletion.Error != null)
            {
                flushTrace["error"] = flushCompletion.Error.DeepClone();
            }

            if (flushCompletion.RawResponse?["usage"] != null)
            {
                flushTrace["usage"] = flushCompletion.RawResponse["usage"]?.DeepClone();
            }

            var flushPreview = Clip(ExtractOpenAiResponseContent(flushCompletion.RawResponse), 700);
            if (!string.IsNullOrWhiteSpace(flushPreview))
            {
                flushTrace["assistantTextPreview"] = flushPreview;
            }

            openAiTrace.Add(flushTrace);

            if (flushCompletion.IsSuccess)
            {
                if (!string.IsNullOrWhiteSpace(flushCompletion.ResponseId))
                {
                    providerRunId = flushCompletion.ResponseId;
                    previousResponseId = flushCompletion.ResponseId;
                }

                if (!string.IsNullOrWhiteSpace(flushCompletion.ConversationId))
                {
                    providerConversationId = flushCompletion.ConversationId;
                }

                var flushAnswer = ExtractOpenAiResponseContent(flushCompletion.RawResponse);
                if (!string.IsNullOrWhiteSpace(flushAnswer))
                {
                    if (LooksLikeOpenAiToolDispatchLeak(flushAnswer))
                    {
                        warnings.Add(
                            "OpenAI вернул служебный текст tool-dispatch на этапе limit_flush. " +
                            "Игнорирую его и продолжаю финализацию.");
                    }
                    else
                    {
                        return new McpChatResponse
                        {
                            Provider = OpenAiProviderName,
                            Model = openAi.Model,
                            Answer = flushAnswer,
                            Data = toolTrace.Count > 0 ? toolTrace : null,
                            Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                            Warnings = warnings.Count > 0 ? warnings : null,
                            ProviderRunId = providerRunId,
                            ProviderConversationId = providerConversationId,
                            OrchestratorPhase = "finalizing",
                            OrchestratorWarnings = warnings.Count > 0 ? warnings.ToList() : null
                        };
                    }
                }

                var extraToolCalls = ExtractOpenAiResponseToolCalls(flushCompletion.RawResponse);
                if (extraToolCalls.Count > 0)
                {
                    skipFinalize = true;
                    warnings.Add(
                        $"После отправки последних tool output OpenAI запросил еще {extraToolCalls.Count} tool-вызов(ов), " +
                        "но лимит итераций уже исчерпан. Перехожу к fallback-ответу.");
                }
            }
            else
            {
                warnings.Add("Не удалось отправить последние tool output перед финализацией.");
            }
        }

        var finalizedAnswer = skipFinalize
            ? null
            : await TryFinalizeOpenAiAnswerWithoutToolsViaResponsesAsync(
                apiKey,
                openAi,
                previousResponseId,
                providerConversationId,
                cancellationToken,
                openAiTrace,
                "limit_finalize");

        if (!string.IsNullOrWhiteSpace(finalizedAnswer))
        {
            return new McpChatResponse
            {
                Provider = OpenAiProviderName,
                Model = openAi.Model,
                Answer = finalizedAnswer,
                Data = toolTrace.Count > 0 ? toolTrace : null,
                Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                Warnings = warnings.Count > 0 ? warnings : null,
                ProviderRunId = providerRunId,
                ProviderConversationId = providerConversationId,
                OrchestratorPhase = "finalizing",
                OrchestratorWarnings = warnings.Count > 0 ? warnings.ToList() : null
            };
        }

        var fallbackAnswer = TryBuildToolDataFallback(toolTrace)
                             ?? TryBuildToolErrorFallback(toolTrace);
        if (!string.IsNullOrWhiteSpace(fallbackAnswer))
        {
            return new McpChatResponse
            {
                Provider = OpenAiProviderName,
                Model = openAi.Model,
                Answer = fallbackAnswer,
                Data = toolTrace.Count > 0 ? toolTrace : null,
                Trace = openAiTrace.Count > 0 ? openAiTrace : null,
                Warnings = warnings.Count > 0 ? warnings : null,
                ProviderRunId = providerRunId,
                ProviderConversationId = providerConversationId,
                OrchestratorPhase = "finalizing",
                OrchestratorWarnings = warnings.Count > 0 ? warnings.ToList() : null
            };
        }

        return new McpChatResponse
        {
            IsError = true,
            Provider = OpenAiProviderName,
            Model = openAi.Model,
            Answer = $"Достигнут лимит tool-итераций OpenAI ({openAi.MaxToolIterations}).",
            Data = toolTrace.Count > 0 ? toolTrace : null,
            Trace = openAiTrace.Count > 0 ? openAiTrace : null,
            Warnings = warnings.Count > 0 ? warnings : null,
            ProviderRunId = providerRunId,
            ProviderConversationId = providerConversationId,
            OrchestratorPhase = "finalizing",
            OrchestratorWarnings = warnings.Count > 0 ? warnings.ToList() : null
        };
    }

    private async Task<string?> TryFinalizeOpenAiAnswerWithoutToolsViaResponsesAsync(
        string apiKey,
        McpOpenAiOptions options,
        string? previousResponseId,
        string? conversationId,
        CancellationToken cancellationToken,
        JsonArray? openAiTrace = null,
        string phase = "finalize_no_tools")
    {
        var finalizeOptions = CloneOpenAiOptions(options);
        finalizeOptions.MaxOutputTokens = Math.Clamp(Math.Max(options.MaxOutputTokens, 3000), 64, 8192);

        var currentInput = CreateOpenAiUserMessageInput(
            "Больше не вызывай tools. Дай финальный ответ по уже полученным данным в этом сообщении. " +
            "Не задавай встречных вопросов и не проси подтверждений. " +
            "Если формат явно не указан, для числовых данных используй markdown-таблицу и затем короткий вывод. " +
            "Если уместна визуализация, используй markdown chart-блоки `bar`/`pie`; для свечного графика — `candlestick` с внутренним маршрутом сервиса (без внешних URL).");
        var currentPreviousResponseId = previousResponseId;
        var currentConversationId = conversationId;
        const int maxFinalizeAttempts = 3;

        for (var attempt = 0; attempt < maxFinalizeAttempts; attempt++)
        {
            var completion = await CallOpenAiResponsesAsync(
                apiKey,
                finalizeOptions,
                currentInput,
                new JsonArray(),
                cancellationToken,
                currentPreviousResponseId,
                currentConversationId);

            if (openAiTrace != null)
            {
                var traceNode = new JsonObject
                {
                    ["phase"] = phase,
                    ["attempt"] = attempt + 1,
                    ["status"] = completion.IsSuccess ? "ok" : "error",
                    ["finishReason"] = completion.FinishReason ?? string.Empty,
                    ["responseId"] = completion.ResponseId ?? string.Empty
                };

                if (completion.Error != null)
                {
                    traceNode["error"] = completion.Error.DeepClone();
                }

                if (completion.RawResponse?["usage"] != null)
                {
                    traceNode["usage"] = completion.RawResponse["usage"]?.DeepClone();
                }

                var preview = Clip(ExtractOpenAiResponseContent(completion.RawResponse), 700);
                if (!string.IsNullOrWhiteSpace(preview))
                {
                    traceNode["assistantTextPreview"] = preview;
                }

                openAiTrace.Add(traceNode);
            }

            if (!completion.IsSuccess)
            {
                if (!string.IsNullOrWhiteSpace(currentPreviousResponseId) &&
                    LooksLikeOpenAiPreviousResponseError(completion.Error) &&
                    attempt + 1 < maxFinalizeAttempts)
                {
                    currentPreviousResponseId = null;
                    currentConversationId = null;
                    currentInput = CreateOpenAiUserMessageInput(
                        "Сессия continuation недоступна. " +
                        "Сформируй финальный ответ на основе уже полученных данных. " +
                        "Не вызывай tools и не задавай уточнений.");
                    continue;
                }

                return null;
            }

            if (!string.IsNullOrWhiteSpace(completion.ResponseId))
            {
                currentPreviousResponseId = completion.ResponseId;
            }

            if (!string.IsNullOrWhiteSpace(completion.ConversationId))
            {
                currentConversationId = completion.ConversationId;
            }

            var answer = ExtractOpenAiResponseContent(completion.RawResponse);
            if (!string.IsNullOrWhiteSpace(answer))
            {
                return answer;
            }

            if (attempt + 1 >= maxFinalizeAttempts)
            {
                return null;
            }

            var finishReason = completion.FinishReason?.Trim().ToLowerInvariant();
            currentInput = finishReason is "length" or "incomplete"
                ? CreateOpenAiUserMessageInput(
                    "Продолжи предыдущий ответ и закончи финальным текстом. " +
                    "Tools вызывать нельзя.")
                : CreateOpenAiUserMessageInput(
                    "Дай только финальный текст по уже собранным данным. " +
                    "Без уточнений и без tools.");
        }

        return null;
    }

    private async Task<OpenAiResponsesResult> CallOpenAiResponsesAsync(
        string apiKey,
        McpOpenAiOptions options,
        JsonNode input,
        JsonArray tools,
        CancellationToken cancellationToken,
        string? previousResponseId = null,
        string? conversationId = null)
    {
        var endpoint = BuildUrl(options.BaseUrl, "responses");
        var payload = new JsonObject
        {
            ["model"] = options.Model,
            ["input"] = input.DeepClone()
        };

        if (tools.Count > 0)
        {
            payload["tools"] = tools.DeepClone();
        }

        if (!string.IsNullOrWhiteSpace(previousResponseId))
        {
            payload["previous_response_id"] = previousResponseId;
        }
        else if (!string.IsNullOrWhiteSpace(conversationId))
        {
            payload["conversation"] = conversationId;
        }
        else if (options.UseConversationsApi)
        {
            payload["conversation"] = "auto";
        }

        if (ShouldSendTemperature(options))
        {
            payload["temperature"] = options.Temperature;
        }

        var maxOutputTokens = options.MaxOutputTokens > 0
            ? options.MaxOutputTokens
            : options.MaxCompletionTokens;
        if (maxOutputTokens > 0)
        {
            payload["max_output_tokens"] = maxOutputTokens;
        }

        if (!string.IsNullOrWhiteSpace(options.ReasoningEffort))
        {
            payload["reasoning"] = new JsonObject
            {
                ["effort"] = options.ReasoningEffort
            };
        }

        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        var serializedPayload = SerializeOneLine(payload);

        const int maxAttempts = 3;
        JsonObject? lastRetryDetails = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            HttpResponseMessage httpResponse;
            string responseContent;

            try
            {
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
                    serializedPayload,
                    Encoding.UTF8,
                    "application/json");

                httpResponse = await httpClient.SendAsync(httpRequest, cancellationToken);
                responseContent = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                var details = new JsonObject
                {
                    ["endpoint"] = endpoint,
                    ["exception"] = ex.Message,
                    ["attempt"] = attempt,
                    ["maxAttempts"] = maxAttempts
                };

                if (attempt < maxAttempts)
                {
                    lastRetryDetails = details;
                    await Task.Delay(GetOpenAiResponsesRetryDelay(attempt), cancellationToken);
                    continue;
                }

                return OpenAiResponsesResult.Fail(
                    "HTTP call to OpenAI Responses failed.",
                    details);
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
                    var parseDetails = new JsonObject
                    {
                        ["statusCode"] = (int)httpResponse.StatusCode,
                        ["exception"] = ex.Message,
                        ["raw"] = Clip(responseContent, 4000),
                        ["attempt"] = attempt,
                        ["maxAttempts"] = maxAttempts
                    };

                    if (attempt < maxAttempts &&
                        ShouldRetryOpenAiResponsesStatus((int)httpResponse.StatusCode))
                    {
                        lastRetryDetails = parseDetails;
                        await Task.Delay(GetOpenAiResponsesRetryDelay(attempt), cancellationToken);
                        continue;
                    }

                    return OpenAiResponsesResult.Fail(
                        "OpenAI Responses JSON parse failed.",
                        parseDetails);
                }
            }

            if (!httpResponse.IsSuccessStatusCode)
            {
                var statusCode = (int)httpResponse.StatusCode;
                var failureDetails = new JsonObject
                {
                    ["statusCode"] = statusCode,
                    ["response"] = parsedResponse?.DeepClone() ?? JsonValue.Create(Clip(responseContent, 4000)),
                    ["attempt"] = attempt,
                    ["maxAttempts"] = maxAttempts
                };

                if (attempt < maxAttempts && ShouldRetryOpenAiResponsesStatus(statusCode))
                {
                    lastRetryDetails = failureDetails;
                    await Task.Delay(GetOpenAiResponsesRetryDelay(attempt), cancellationToken);
                    continue;
                }

                return OpenAiResponsesResult.Fail(
                    "OpenAI Responses returned non-success status code.",
                    failureDetails);
            }

            var responseId = parsedResponse?["id"]?.GetValue<string>();
            var responseConversationId = parsedResponse?["conversation_id"]?.GetValue<string>()
                                         ?? parsedResponse?["conversation"]?["id"]?.GetValue<string>()
                                         ?? parsedResponse?["conversation"]?.GetValue<string>();
            var status = parsedResponse?["status"]?.GetValue<string>();

            if (parsedResponse == null)
            {
                var emptyDetails = new JsonObject
                {
                    ["attempt"] = attempt,
                    ["maxAttempts"] = maxAttempts
                };

                if (attempt < maxAttempts)
                {
                    lastRetryDetails = emptyDetails;
                    await Task.Delay(GetOpenAiResponsesRetryDelay(attempt), cancellationToken);
                    continue;
                }

                return OpenAiResponsesResult.Fail(
                    "OpenAI Responses returned empty payload.",
                    emptyDetails);
            }

            return OpenAiResponsesResult.Success(parsedResponse, status, responseId, responseConversationId);
        }

        return OpenAiResponsesResult.Fail(
            "OpenAI Responses retries exhausted.",
            lastRetryDetails ?? new JsonObject());
    }

    private async Task<OpenAiChatResult> CallOpenAiChatCompletionAsync(
        string apiKey,
        McpOpenAiOptions options,
        JsonArray messages,
        JsonArray tools,
        CancellationToken cancellationToken,
        string? toolChoice = null)
    {
        var endpoint = BuildUrl(options.BaseUrl, "chat/completions");
        var payload = new JsonObject
        {
            ["model"] = options.Model,
            ["messages"] = messages.DeepClone()
        };

        if (tools.Count > 0)
        {
            payload["tools"] = tools.DeepClone();
            payload["tool_choice"] = string.IsNullOrWhiteSpace(toolChoice)
                ? "auto"
                : toolChoice.Trim();
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

        var finishReasonNode = parsedResponse?["choices"]?[0]?["finish_reason"];
        var finishReason = finishReasonNode is JsonValue finishReasonValue &&
                           finishReasonValue.TryGetValue<string>(out var parsedFinishReason)
            ? parsedFinishReason
            : null;
        return OpenAiChatResult.Success(assistantMessage, parsedResponse, finishReason);
    }

    private static JsonArray BuildOpenAiTools(JsonNode? toolsListResponse, bool useResponsesFormat)
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

            if (useResponsesFormat)
            {
                result.Add(new JsonObject
                {
                    ["type"] = "function",
                    ["name"] = name,
                    ["description"] = description,
                    ["parameters"] = schema
                });
            }
            else
            {
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
        }

        return result;
    }

    private static JsonArray BuildOpenAiMessages(McpChatRequest request, string message, McpOpenAiOptions options)
    {
        var messages = new JsonArray();
        var forceNoFollowUps = ShouldForceNoFollowUps(message, request.History);

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

        if (forceNoFollowUps)
        {
            messages.Add(new JsonObject
            {
                ["role"] = "system",
                ["content"] =
                    "Пользователь уже подтвердил выполнение. " +
                    "Не задавай уточняющих вопросов про формат/перечень полей/подтверждение. " +
                    "Сразу выполни tool calls и верни финальный ответ."
            });
        }

        messages.Add(new JsonObject
        {
            ["role"] = "user",
            ["content"] = message
        });

        return messages;
    }

    private static JsonArray CreateOpenAiUserMessageInput(string text, bool forceNoFollowUps = false)
    {
        var input = new JsonArray();
        if (forceNoFollowUps)
        {
            input.Add(new JsonObject
            {
                ["role"] = "system",
                ["content"] =
                    "Пользователь уже подтвердил выполнение. " +
                    "Не задавай уточняющих вопросов. " +
                    "Сразу выполняй нужные действия и давай финальный ответ."
            });
        }

        input.Add(new JsonObject
        {
            ["role"] = "user",
            ["content"] = text
        });

        return input;
    }

    private static JsonObject CreateOpenAiResponseToolOutputItem(string callId, JsonNode payload)
    {
        return new JsonObject
        {
            ["type"] = "function_call_output",
            ["call_id"] = callId,
            ["output"] = SerializeOneLine(payload)
        };
    }

    private static JsonArray BuildOpenAiNativeMcpTools(
        McpOpenAiOptions options,
        McpBridgeOptions bridgeOptions,
        List<string> warnings)
    {
        var result = new JsonArray();
        if (options.NativeMcpServers == null || options.NativeMcpServers.Count == 0)
        {
            return result;
        }

        var sharedAuthToken = TryResolveHttpMcpAuthToken(bridgeOptions);

        foreach (var server in options.NativeMcpServers)
        {
            if (server == null)
            {
                continue;
            }

            var serverUrl = server.ServerUrl?.Trim();
            if (string.IsNullOrWhiteSpace(serverUrl))
            {
                warnings.Add("Пропущен native MCP server без ServerUrl.");
                continue;
            }

            var tool = new JsonObject
            {
                ["type"] = "mcp",
                ["server_label"] = string.IsNullOrWhiteSpace(server.ServerLabel) ? "stockchart-mcp" : server.ServerLabel.Trim(),
                ["server_url"] = serverUrl
            };

            if (!string.IsNullOrWhiteSpace(server.ServerDescription))
            {
                tool["server_description"] = server.ServerDescription.Trim();
            }

            var requireApproval = NormalizeMcpRequireApproval(server.RequireApproval) ?? "never";
            tool["require_approval"] = requireApproval;

            if (server.AllowedTools is { Count: > 0 })
            {
                var allowed = new JsonArray();
                foreach (var item in server.AllowedTools
                             .Where(x => !string.IsNullOrWhiteSpace(x))
                             .Select(x => x.Trim())
                             .Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    allowed.Add(item);
                }

                if (allowed.Count > 0)
                {
                    tool["allowed_tools"] = allowed;
                }
            }

            if (server.Headers is { Count: > 0 })
            {
                var headers = new JsonObject();
                foreach (var pair in server.Headers)
                {
                    if (string.IsNullOrWhiteSpace(pair.Key))
                    {
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(pair.Value))
                    {
                        continue;
                    }

                    headers[pair.Key.Trim()] = pair.Value.Trim();
                }

                if (headers.Count > 0)
                {
                    tool["headers"] = headers;
                }
            }
            else if (!string.IsNullOrWhiteSpace(sharedAuthToken))
            {
                tool["headers"] = new JsonObject
                {
                    ["Authorization"] = $"Bearer {sharedAuthToken}"
                };
            }
            else
            {
                warnings.Add(
                    $"Native MCP server '{tool["server_label"]}' configured without headers and shared MCP token. " +
                    "Requests may fail with 401.");
            }

            result.Add(tool);
        }

        return result;
    }

    private static string? NormalizeMcpRequireApproval(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized is "always" or "never" or "filter"
            ? normalized
            : null;
    }

    private static string ExtractOpenAiResponseContent(JsonNode? rawResponse)
    {
        var texts = new List<string>();
        AppendOpenAiTextParts(rawResponse?["output_text"], texts);
        AppendOpenAiTextParts(rawResponse?["text"], texts);

        if (rawResponse?["output"] is JsonArray output)
        {
            foreach (var item in output)
            {
                var itemType = item?["type"]?.GetValue<string>();
                if (string.Equals(itemType, "function_call", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(itemType, "function_call_output", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                AppendOpenAiTextParts(item?["content"], texts);
                AppendOpenAiTextParts(item?["output_text"], texts);
                AppendOpenAiTextParts(item?["text"], texts);
                AppendOpenAiTextParts(item?["summary"], texts);
            }
        }

        return texts.Count == 0 ? string.Empty : string.Join("\n", texts);
    }

    private static JsonArray ExtractOpenAiResponseToolCalls(JsonNode? rawResponse)
    {
        var result = new JsonArray();
        if (rawResponse?["output"] is not JsonArray output || output.Count == 0)
        {
            return result;
        }

        foreach (var item in output)
        {
            var itemType = item?["type"]?.GetValue<string>();
            if (!string.Equals(itemType, "function_call", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var name = item?["name"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var callId = item?["call_id"]?.GetValue<string>()
                         ?? item?["id"]?.GetValue<string>()
                         ?? $"call_{Guid.NewGuid():N}";

            var argumentsRaw = "{}";
            if (item?["arguments"] is JsonValue argumentsValue &&
                argumentsValue.TryGetValue<string>(out var parsedArguments))
            {
                argumentsRaw = parsedArguments;
            }
            else if (item?["arguments"] != null)
            {
                argumentsRaw = SerializeOneLine(item["arguments"]!);
            }

            result.Add(new JsonObject
            {
                ["id"] = callId,
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = name,
                    ["arguments"] = argumentsRaw
                }
            });
        }

        return result;
    }

    private static bool HasOpenAiFunctionCallOutputItems(JsonNode? input)
    {
        if (input is not JsonArray items || items.Count == 0)
        {
            return false;
        }

        foreach (var item in items)
        {
            var type = item?["type"]?.GetValue<string>();
            if (string.Equals(type, "function_call_output", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool LooksLikeOpenAiToolDispatchLeak(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        var lower = text.Trim().ToLowerInvariant();
        if (lower.Contains("to=functions.", StringComparison.Ordinal) ||
            lower.Contains("to=functions_", StringComparison.Ordinal) ||
            lower.Contains("(to=", StringComparison.Ordinal) && lower.Contains("functions", StringComparison.Ordinal))
        {
            return true;
        }

        return lower.StartsWith("searching ", StringComparison.Ordinal) &&
               lower.Contains("metric", StringComparison.Ordinal);
    }

    private static bool ShouldBypassClarificationLoop(
        string userMessage,
        string assistantAnswer,
        List<McpChatHistoryItem>? history,
        int clarificationLoopAttempts,
        int iteration,
        int maxIterations)
    {
        if (clarificationLoopAttempts >= 2 || iteration + 1 >= maxIterations)
        {
            return false;
        }

        if (!LooksLikeClarificationMessage(assistantAnswer))
        {
            return false;
        }

        if (LooksLikeProceedSignal(userMessage))
        {
            return true;
        }

        if (history == null || history.Count == 0)
        {
            return false;
        }

        var recentAssistantClarifications = history
            .Where(x => string.Equals(x.Role, "assistant", StringComparison.OrdinalIgnoreCase))
            .Where(x => !string.IsNullOrWhiteSpace(x.Content))
            .TakeLast(4)
            .Count(x => LooksLikeClarificationMessage(x.Content!));

        if (recentAssistantClarifications < 2)
        {
            return false;
        }

        return history
            .Where(x => string.Equals(x.Role, "user", StringComparison.OrdinalIgnoreCase))
            .Where(x => !string.IsNullOrWhiteSpace(x.Content))
            .TakeLast(3)
            .Any(x => LooksLikeProceedSignal(x.Content!));
    }

    private static bool ShouldForceNoFollowUps(string userMessage, List<McpChatHistoryItem>? history)
    {
        if (LooksLikeProceedSignal(userMessage))
        {
            return true;
        }

        if (history == null || history.Count == 0)
        {
            return false;
        }

        var assistantAskedClarification = history
            .Where(x => string.Equals(x.Role, "assistant", StringComparison.OrdinalIgnoreCase))
            .Where(x => !string.IsNullOrWhiteSpace(x.Content))
            .TakeLast(2)
            .Any(x => LooksLikeClarificationMessage(x.Content!));

        if (!assistantAskedClarification)
        {
            return false;
        }

        var trimmed = (userMessage ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            return false;
        }

        if (trimmed.Length <= 80)
        {
            return true;
        }

        var lower = trimmed.ToLowerInvariant();
        return lower.StartsWith("все ", StringComparison.Ordinal) ||
               string.Equals(lower, "все", StringComparison.Ordinal) ||
               lower.StartsWith("all ", StringComparison.Ordinal) ||
               string.Equals(lower, "all", StringComparison.Ordinal);
    }

    private static bool LooksLikeProceedSignal(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        var normalized = text.Trim();
        if (ProceedSignalRegex.IsMatch(normalized))
        {
            return true;
        }

        var lower = normalized.ToLowerInvariant();
        return lower.Contains("без лишних вопросов", StringComparison.Ordinal) ||
               lower.Contains("как знаешь", StringComparison.Ordinal) ||
               lower.Contains("таблица прямо в сообщ", StringComparison.Ordinal);
    }

    private static bool LooksLikeClarificationMessage(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        var lower = text.ToLowerInvariant();
        var hits = 0;
        if (lower.Contains("подтверд", StringComparison.Ordinal)) hits++;
        if (lower.Contains("уточн", StringComparison.Ordinal)) hits++;
        if (lower.Contains("укажите", StringComparison.Ordinal)) hits++;
        if (lower.Contains("какие тикер", StringComparison.Ordinal)) hits++;
        if (lower.Contains("формат вывода", StringComparison.Ordinal)) hits++;
        if (lower.Contains("после подтверждения", StringComparison.Ordinal)) hits++;

        return hits >= 2 || (hits >= 1 && lower.Contains("?", StringComparison.Ordinal));
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

    private static JsonArray BuildOpenAiToolNames(JsonArray toolCalls)
    {
        var names = new JsonArray();
        foreach (var callNode in toolCalls)
        {
            var toolName = callNode?["function"]?["name"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(toolName))
            {
                continue;
            }

            names.Add(toolName);
        }

        return names;
    }

    private static JsonNode? CompactToolPayloadForModel(JsonNode? node, int depth = 0)
    {
        if (node == null)
        {
            return null;
        }

        if (depth >= OpenAiToolPayloadDepthLimit)
        {
            return JsonValue.Create("...truncated_depth...");
        }

        if (node is JsonValue value)
        {
            if (value.TryGetValue<string>(out var text))
            {
                return JsonValue.Create(Clip(text, OpenAiToolPayloadStringLimit));
            }

            return node.DeepClone();
        }

        if (node is JsonArray array)
        {
            var result = new JsonArray();
            var take = Math.Min(array.Count, OpenAiToolPayloadArrayLimit);
            for (var i = 0; i < take; i++)
            {
                result.Add(CompactToolPayloadForModel(array[i], depth + 1));
            }

            if (array.Count > take)
            {
                result.Add(new JsonObject
                {
                    ["_truncatedItems"] = array.Count - take
                });
            }

            return result;
        }

        if (node is JsonObject obj)
        {
            var result = new JsonObject();
            var index = 0;
            foreach (var pair in obj)
            {
                if (index >= OpenAiToolPayloadObjectLimit)
                {
                    break;
                }

                result[pair.Key] = CompactToolPayloadForModel(pair.Value, depth + 1);
                index++;
            }

            if (obj.Count > index)
            {
                result["_truncatedFields"] = obj.Count - index;
            }

            return result;
        }

        return node.DeepClone();
    }

    private static JsonArray ExtractOpenAiToolCalls(JsonObject assistantMessage)
    {
        if (assistantMessage["tool_calls"] is JsonArray toolCalls && toolCalls.Count > 0)
        {
            return toolCalls;
        }

        if (assistantMessage["function_call"] is not JsonObject functionCall)
        {
            return [];
        }

        var functionName = functionCall["name"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(functionName))
        {
            return [];
        }

        return
        [
            new JsonObject
            {
                ["id"] = $"call_{Guid.NewGuid():N}",
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = functionName,
                    ["arguments"] = functionCall["arguments"]?.GetValue<string>() ?? "{}"
                }
            }
        ];
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

            lines.Add(string.Empty);
            lines.Add("```pie");
            lines.Add(BuildMarkowitzPiePayloadJson(
                chart,
                $"Структура портфеля Марковица ({startDate:yyyy-MM-dd} - {endDate:yyyy-MM-dd})"));
            lines.Add("```");
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

    private static string ExtractOpenAiContent(JsonObject assistantMessage, JsonNode? rawResponse = null)
    {
        var texts = new List<string>();

        AppendOpenAiTextParts(assistantMessage["content"], texts);
        AppendOpenAiTextParts(assistantMessage["refusal"], texts);

        if (texts.Count == 0)
        {
            AppendOpenAiTextParts(rawResponse?["choices"]?[0]?["message"]?["content"], texts);
            AppendOpenAiTextParts(rawResponse?["choices"]?[0]?["message"]?["refusal"], texts);
            AppendOpenAiTextParts(rawResponse?["choices"]?[0]?["text"], texts);

            if (rawResponse?["output"] is JsonArray output)
            {
                foreach (var item in output)
                {
                    AppendOpenAiTextParts(item?["content"], texts);
                    AppendOpenAiTextParts(item?["output_text"], texts);
                    AppendOpenAiTextParts(item?["text"], texts);
                }
            }
        }

        return texts.Count == 0 ? string.Empty : string.Join("\n", texts);
    }

    private static void AppendOpenAiTextParts(JsonNode? node, List<string> texts)
    {
        if (node == null)
        {
            return;
        }

        if (node is JsonValue value)
        {
            if (value.TryGetValue<string>(out var text))
            {
                AddUniqueText(texts, text);
            }

            return;
        }

        if (node is JsonArray array)
        {
            foreach (var item in array)
            {
                AppendOpenAiTextParts(item, texts);
            }

            return;
        }

        if (node is not JsonObject obj)
        {
            return;
        }

        AppendOpenAiTextParts(obj["text"], texts);
        AppendOpenAiTextParts(obj["value"], texts);
        AppendOpenAiTextParts(obj["content"], texts);
        AppendOpenAiTextParts(obj["output_text"], texts);
        AppendOpenAiTextParts(obj["refusal"], texts);
        AppendOpenAiTextParts(obj["summary"], texts);
    }

    private static void AddUniqueText(List<string> texts, string? value)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return;
        }

        for (var i = 0; i < texts.Count; i++)
        {
            if (string.Equals(texts[i], trimmed, StringComparison.Ordinal))
            {
                return;
            }
        }

        texts.Add(trimmed);
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

    private static string? TryBuildToolDataFallback(JsonArray toolTrace)
    {
        if (toolTrace.Count == 0)
        {
            return null;
        }

        var oilAndDividends = TryBuildOilAndDividendsFallback(toolTrace);
        if (!string.IsNullOrWhiteSpace(oilAndDividends))
        {
            return oilAndDividends;
        }

        var successCount = 0;
        var uniqueTools = new List<string>();
        var errors = new List<string>();

        foreach (var item in toolTrace)
        {
            if (item is not JsonObject entry)
            {
                continue;
            }

            var isError = entry["isError"]?.GetValue<bool>() ?? true;
            var toolName = entry["tool"]?.GetValue<string>()?.Trim();

            if (!isError)
            {
                successCount++;
                if (!string.IsNullOrWhiteSpace(toolName) &&
                    !uniqueTools.Contains(toolName, StringComparer.OrdinalIgnoreCase))
                {
                    uniqueTools.Add(toolName);
                }

                continue;
            }

            var errorMessage = entry["data"]?["error"]?["message"]?.GetValue<string>()
                               ?? entry["error"]?["message"]?.GetValue<string>()
                               ?? entry["error"]?.GetValue<string>();

            if (!string.IsNullOrWhiteSpace(errorMessage))
            {
                errors.Add(errorMessage.Trim());
            }
        }

        if (successCount == 0)
        {
            return null;
        }

        var lines = new List<string>
        {
            $"OpenAI не вернул финальный текст, но выполнил {successCount} успешных tool-вызовов."
        };

        if (uniqueTools.Count > 0)
        {
            lines.Add($"Tools: {string.Join(", ", uniqueTools.Take(8))}.");
        }

        if (errors.Count > 0)
        {
            lines.Add($"Также были ошибки tools: {string.Join("; ", errors.Distinct(StringComparer.Ordinal).Take(2))}.");
        }

        lines.Add("Откройте «Шаги OpenAI» или JSON-детали у сообщения.");
        return string.Join('\n', lines);
    }

    private static string? TryBuildOilAndDividendsFallback(JsonArray toolTrace)
    {
        var namesByTicker = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var oilByTicker = new Dictionary<string, (decimal Value, string Period)>(StringComparer.OrdinalIgnoreCase);
        var dividendByTicker = new Dictionary<string, (decimal Value, string Period, string? Yield)>(StringComparer.OrdinalIgnoreCase);

        foreach (var item in toolTrace)
        {
            if (item is not JsonObject entry)
            {
                continue;
            }

            if (entry["isError"]?.GetValue<bool>() ?? true)
            {
                continue;
            }

            var toolName = entry["tool"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(toolName))
            {
                continue;
            }

            var dataNode = entry["data"];
            if (dataNode == null)
            {
                continue;
            }

            if (string.Equals(toolName, "search_stocks", StringComparison.OrdinalIgnoreCase))
            {
                ExtractTickerNamesFromSearchStocks(dataNode, namesByTicker);
                continue;
            }

            if (string.Equals(toolName, "statement_series_batch", StringComparison.OrdinalIgnoreCase))
            {
                ExtractLatestSeriesFromBatch(dataNode, oilByTicker, dividendByTicker);
                continue;
            }

            if (string.Equals(toolName, "dividends", StringComparison.OrdinalIgnoreCase))
            {
                ExtractLatestDividendHistory(dataNode, dividendByTicker);
            }
        }

        var tickers = oilByTicker.Keys
            .Concat(dividendByTicker.Keys)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (tickers.Count == 0)
        {
            return null;
        }

        var ordered = tickers
            .OrderByDescending(ticker => oilByTicker.TryGetValue(ticker, out var oil) ? oil.Value : decimal.MinValue)
            .ThenByDescending(ticker => dividendByTicker.TryGetValue(ticker, out var dividend) ? dividend.Value : decimal.MinValue)
            .ThenBy(ticker => ticker, StringComparer.OrdinalIgnoreCase)
            .Take(12)
            .ToList();

        var lines = new List<string>
        {
            "OpenAI не вернул финальный текст. Сформировал результат по данным выполненных tools.",
            "",
            "| Тикер | Компания | Добыча нефти | Дивиденд | Доходность |",
            "|---|---|---:|---:|---:|"
        };

        foreach (var ticker in ordered)
        {
            namesByTicker.TryGetValue(ticker, out var companyName);
            var companyText = string.IsNullOrWhiteSpace(companyName) ? "-" : EscapeMarkdownCell(companyName);

            var oilText = "n/a";
            if (oilByTicker.TryGetValue(ticker, out var oil))
            {
                var period = string.IsNullOrWhiteSpace(oil.Period) ? string.Empty : $" ({oil.Period})";
                oilText = $"{oil.Value.ToString("0.##", CultureInfo.InvariantCulture)}{period}";
            }

            var dividendText = "n/a";
            var yieldText = "n/a";
            if (dividendByTicker.TryGetValue(ticker, out var dividend))
            {
                var period = string.IsNullOrWhiteSpace(dividend.Period) ? string.Empty : $" ({dividend.Period})";
                dividendText = $"{dividend.Value.ToString("0.##", CultureInfo.InvariantCulture)}{period}";
                if (!string.IsNullOrWhiteSpace(dividend.Yield))
                {
                    yieldText = EscapeMarkdownCell(dividend.Yield);
                }
            }

            lines.Add($"| {ticker} | {companyText} | {oilText} | {dividendText} | {yieldText} |");
        }

        lines.Add("");
        lines.Add("Источник: `statement_series_batch`, `dividends`, `search_stocks`.");
        return string.Join('\n', lines);
    }

    private static void ExtractTickerNamesFromSearchStocks(
        JsonNode dataNode,
        Dictionary<string, string> namesByTicker)
    {
        if (dataNode?["data"] is not JsonArray rows)
        {
            return;
        }

        foreach (var row in rows)
        {
            var ticker = NormalizeTickerSymbol(row?["ticker"]?.GetValue<string>());
            if (string.IsNullOrWhiteSpace(ticker))
            {
                continue;
            }

            var name = row?["name"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            namesByTicker[ticker] = name;
        }
    }

    private static void ExtractLatestSeriesFromBatch(
        JsonNode dataNode,
        Dictionary<string, (decimal Value, string Period)> oilByTicker,
        Dictionary<string, (decimal Value, string Period, string? Yield)> dividendByTicker)
    {
        if (dataNode?["results"] is not JsonArray results)
        {
            return;
        }

        foreach (var resultNode in results)
        {
            var ticker = NormalizeTickerSymbol(resultNode?["ticker"]?.GetValue<string>());
            if (string.IsNullOrWhiteSpace(ticker))
            {
                continue;
            }

            var metricKey = resultNode?["metricKey"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(metricKey))
            {
                continue;
            }

            if (resultNode?["points"] is not JsonArray points)
            {
                continue;
            }

            if (!TryExtractLatestPointFromSeries(points, out var value, out var period))
            {
                continue;
            }

            if (string.Equals(metricKey, "oil_production", StringComparison.OrdinalIgnoreCase))
            {
                UpsertLatestOil(oilByTicker, ticker, value, period);
                continue;
            }

            if (metricKey.StartsWith("dividend", StringComparison.OrdinalIgnoreCase))
            {
                UpsertLatestDividend(dividendByTicker, ticker, value, period, null);
            }
        }
    }

    private static void ExtractLatestDividendHistory(
        JsonNode dataNode,
        Dictionary<string, (decimal Value, string Period, string? Yield)> dividendByTicker)
    {
        var ticker = NormalizeTickerSymbol(
            dataNode?["ticker"]?.GetValue<string>() ??
            dataNode?["Ticker"]?.GetValue<string>());

        if (string.IsNullOrWhiteSpace(ticker))
        {
            return;
        }

        var dividends = (dataNode?["dividends"] ?? dataNode?["Dividends"]) as JsonArray;
        if (dividends == null)
        {
            return;
        }

        decimal? bestValue = null;
        var bestPeriod = string.Empty;
        string? bestYield = null;
        var bestRank = int.MinValue;
        var bestIndex = -1;

        for (var i = 0; i < dividends.Count; i++)
        {
            var row = dividends[i] as JsonObject;
            if (row == null)
            {
                continue;
            }

            var value = TryReadDecimalFlexible(row["dividend"] ?? row["Dividend"]);
            if (!value.HasValue)
            {
                continue;
            }

            var period =
                row["recordDate"]?.GetValue<string>() ??
                row["RecordDate"]?.GetValue<string>() ??
                row["buyBefore"]?.GetValue<string>() ??
                row["BuyBefore"]?.GetValue<string>() ??
                string.Empty;

            var rank = GetPeriodRank(period);
            if (!bestValue.HasValue || rank > bestRank || (rank == bestRank && i > bestIndex))
            {
                bestValue = value.Value;
                bestPeriod = period.Trim();
                bestYield =
                    row["yield"]?.GetValue<string>()?.Trim() ??
                    row["Yield"]?.GetValue<string>()?.Trim();
                bestRank = rank;
                bestIndex = i;
            }
        }

        if (!bestValue.HasValue)
        {
            return;
        }

        UpsertLatestDividend(dividendByTicker, ticker, bestValue.Value, bestPeriod, bestYield);
    }

    private static bool TryExtractLatestPointFromSeries(
        JsonArray points,
        out decimal value,
        out string period)
    {
        value = 0;
        period = string.Empty;
        var hasValue = false;
        var bestRank = int.MinValue;
        var bestIndex = -1;

        for (var i = 0; i < points.Count; i++)
        {
            var point = points[i] as JsonObject;
            if (point == null)
            {
                continue;
            }

            var pointValue = TryReadDecimalFlexible(point["valueNum"] ?? point["valueRaw"] ?? point["value"]);
            if (!pointValue.HasValue)
            {
                continue;
            }

            var pointPeriod = point["x"]?.GetValue<string>()?.Trim() ?? string.Empty;
            var rank = GetPeriodRank(pointPeriod);
            if (!hasValue || rank > bestRank || (rank == bestRank && i > bestIndex))
            {
                value = pointValue.Value;
                period = pointPeriod;
                hasValue = true;
                bestRank = rank;
                bestIndex = i;
            }
        }

        return hasValue;
    }

    private static void UpsertLatestOil(
        Dictionary<string, (decimal Value, string Period)> oilByTicker,
        string ticker,
        decimal value,
        string period)
    {
        if (!oilByTicker.TryGetValue(ticker, out var existing) ||
            GetPeriodRank(period) >= GetPeriodRank(existing.Period))
        {
            oilByTicker[ticker] = (value, period);
        }
    }

    private static void UpsertLatestDividend(
        Dictionary<string, (decimal Value, string Period, string? Yield)> dividendByTicker,
        string ticker,
        decimal value,
        string period,
        string? yield)
    {
        if (!dividendByTicker.TryGetValue(ticker, out var existing) ||
            GetPeriodRank(period) >= GetPeriodRank(existing.Period))
        {
            dividendByTicker[ticker] = (value, period, yield);
        }
    }

    private static decimal? TryReadDecimalFlexible(JsonNode? node)
    {
        var numeric = TryReadDecimal(node);
        if (numeric.HasValue)
        {
            return numeric.Value;
        }

        if (node is not JsonValue value || !value.TryGetValue<string>(out var text))
        {
            return null;
        }

        var normalized = (text ?? string.Empty)
            .Trim()
            .Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace(",", ".", StringComparison.Ordinal)
            .Replace("%", string.Empty, StringComparison.Ordinal);

        if (decimal.TryParse(
                normalized,
                NumberStyles.Float | NumberStyles.AllowLeadingSign,
                CultureInfo.InvariantCulture,
                out var parsed))
        {
            return parsed;
        }

        return null;
    }

    private static string? NormalizeTickerSymbol(string? ticker)
    {
        if (string.IsNullOrWhiteSpace(ticker))
        {
            return null;
        }

        var normalized = ticker.Trim().ToUpperInvariant();
        return normalized.Length == 0 ? null : normalized;
    }

    private static int GetPeriodRank(string? period)
    {
        if (string.IsNullOrWhiteSpace(period))
        {
            return int.MinValue;
        }

        var source = period.Trim();
        if (DateTime.TryParse(source, CultureInfo.GetCultureInfo("ru-RU"), DateTimeStyles.None, out var ruDate))
        {
            return ruDate.Year * 10000 + ruDate.Month * 100 + ruDate.Day;
        }

        if (DateTime.TryParse(source, CultureInfo.InvariantCulture, DateTimeStyles.None, out var invDate))
        {
            return invDate.Year * 10000 + invDate.Month * 100 + invDate.Day;
        }

        var match = Regex.Match(source, @"(?<year>\d{4})(?:\D*(?<part>\d{1,2}))?", RegexOptions.CultureInvariant);
        if (match.Success && int.TryParse(match.Groups["year"].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var year))
        {
            var part = 0;
            if (match.Groups["part"].Success)
            {
                int.TryParse(match.Groups["part"].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out part);
            }

            return year * 100 + Math.Clamp(part, 0, 99);
        }

        return int.MinValue + 1;
    }

    private static string EscapeMarkdownCell(string value)
    {
        return (value ?? string.Empty)
            .Replace("|", "\\|", StringComparison.Ordinal)
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal)
            .Trim();
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

    private static string NormalizeOpenAiApiMode(string? mode)
    {
        if (string.IsNullOrWhiteSpace(mode))
        {
            return OpenAiApiModeResponsesCustomTools;
        }

        var normalized = mode.Trim().ToLowerInvariant();
        return normalized is OpenAiApiModeLegacy or OpenAiApiModeResponsesCustomTools or OpenAiApiModeResponsesNativeMcp
            ? normalized
            : OpenAiApiModeResponsesCustomTools;
    }

    private static string? NormalizeReasoningEffort(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized is "low" or "medium" or "high"
            ? normalized
            : null;
    }

    private static McpOpenAiOptions CloneOpenAiOptions(McpOpenAiOptions source)
    {
        return new McpOpenAiOptions
        {
            Enabled = source.Enabled,
            ApiKey = source.ApiKey,
            ApiKeyEnvVar = source.ApiKeyEnvVar,
            BaseUrl = source.BaseUrl,
            Model = source.Model,
            Organization = source.Organization,
            Project = source.Project,
            TimeoutSeconds = source.TimeoutSeconds,
            Temperature = source.Temperature,
            MaxCompletionTokens = source.MaxCompletionTokens,
            MaxOutputTokens = source.MaxOutputTokens,
            MaxToolIterations = source.MaxToolIterations,
            SystemPrompt = source.SystemPrompt,
            ApiMode = source.ApiMode,
            UseConversationsApi = source.UseConversationsApi,
            ReasoningEffort = source.ReasoningEffort,
            NativeMcpServers = source.NativeMcpServers
                ?.Select(x => new McpOpenAiNativeMcpServerOptions
                {
                    ServerLabel = x.ServerLabel,
                    ServerUrl = x.ServerUrl,
                    ServerDescription = x.ServerDescription,
                    RequireApproval = x.RequireApproval,
                    AllowedTools = x.AllowedTools?.ToList() ?? [],
                    Headers = x.Headers != null
                        ? new Dictionary<string, string>(x.Headers, StringComparer.OrdinalIgnoreCase)
                        : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                })
                .ToList() ?? []
        };
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

        options.OpenAi.ApiMode = NormalizeOpenAiApiMode(options.OpenAi.ApiMode);
        options.OpenAi.ReasoningEffort = NormalizeReasoningEffort(options.OpenAi.ReasoningEffort);
        options.OpenAi.TimeoutSeconds = Math.Clamp(options.OpenAi.TimeoutSeconds, 10, 300);
        options.OpenAi.MaxToolIterations = Math.Clamp(options.OpenAi.MaxToolIterations, 1, 24);
        options.OpenAi.MaxCompletionTokens = Math.Clamp(options.OpenAi.MaxCompletionTokens, 64, 8192);
        options.OpenAi.MaxOutputTokens = Math.Clamp(options.OpenAi.MaxOutputTokens, 0, 8192);
        options.OpenAi.NativeMcpServers ??= [];

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

    private static JsonObject BuildOpenAiProviderErrorPayload(JsonObject? error)
    {
        var statusCode = error?["details"]?["statusCode"]?.GetValue<int>() ?? 0;
        var code = statusCode switch
        {
            429 => "openai_rate_limited",
            401 or 403 => "openai_auth_error",
            _ => "openai_invalid_response"
        };

        return new JsonObject
        {
            ["code"] = code,
            ["error"] = error?.DeepClone() ?? new JsonObject()
        };
    }

    private static bool LooksLikeOpenAiPreviousResponseError(JsonObject? error)
    {
        if (error == null)
        {
            return false;
        }

        var details = error["details"] as JsonObject;
        var responseText = details?["response"]?.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = false
        }) ?? string.Empty;
        var messageText = error["message"]?.GetValue<string>() ?? string.Empty;

        var lower = $"{messageText}\n{responseText}".ToLowerInvariant();
        if (!lower.Contains("previous_response", StringComparison.Ordinal))
        {
            return false;
        }

        return lower.Contains("not found", StringComparison.Ordinal) ||
               lower.Contains("invalid", StringComparison.Ordinal) ||
               lower.Contains("expired", StringComparison.Ordinal) ||
               lower.Contains("unknown", StringComparison.Ordinal);
    }

    private static bool ShouldRetryOpenAiResponsesStatus(int statusCode)
    {
        return statusCode is 408 or 409 or 425 or 429 || statusCode >= 500;
    }

    private static TimeSpan GetOpenAiResponsesRetryDelay(int attempt)
    {
        var milliseconds = Math.Clamp(350 * attempt, 250, 1500);
        return TimeSpan.FromMilliseconds(milliseconds);
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
                "Также можно писать запросы вроде `дивиденды SBER`, `покажи рынки`, `барометр SBER GAZP`, `свечной график SBER`. " +
                "Для визуализаций поддерживаются markdown chart-блоки `bar`, `pie`, `candlestick`.",
            Suggestions =
            [
                "/tools",
                "/tool list_markets {}",
                "/tool dividends {\"ticker\":\"SBER\"}",
                "дивиденды GAZP",
                "барометр SBER GAZP",
                "свечной график SBER",
                "подбери портфель марковица из топ 10 акций по объему за прошлый год"
            ]
        };
    }

    private static McpChatResponse? TryHandleCandlestickRequest(string message, string lower)
    {
        if (!ContainsAny(lower, "свеч", "candlestick", "candle", "кандл"))
        {
            return null;
        }

        var ticker = ExtractTickers(message).FirstOrDefault();
        if (string.IsNullOrWhiteSpace(ticker))
        {
            return new McpChatResponse
            {
                IsError = true,
                Answer = "Укажите тикер для свечного графика. Пример: свечной график SBER",
                Suggestions =
                [
                    "свечной график SBER",
                    "candlestick chart GAZP"
                ]
            };
        }

        var period = ResolveCandlestickPeriod(lower);
        var rperiod = ResolveCandlestickRperiod(lower);
        var (startDate, endDate) = ResolveCandlestickRangeUtc(lower);
        var block = BuildCandlestickMarkdownBlock(
            ticker,
            period,
            rperiod,
            startDate,
            endDate,
            "candles",
            $"Открыть свечной график {ticker}");

        return new McpChatResponse
        {
            Answer = $"Свечной график для `{ticker}`.\n\n{block}",
            Suggestions =
            [
                $"свечной график {ticker}",
                $"свечной график {ticker} за прошлый месяц"
            ]
        };
    }

    private static int ResolveCandlestickPeriod(string lower)
    {
        var match = Regex.Match(lower ?? string.Empty, @"(?:period|период)\s*(?:=|:)?\s*(\d{1,4})", RegexOptions.IgnoreCase);
        if (match.Success &&
            int.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return Math.Clamp(parsed, 0, 1440);
        }

        return 1;
    }

    private static string ResolveCandlestickRperiod(string lower)
    {
        if (ContainsAny(lower, "week", "недел"))
        {
            return "week";
        }

        if (ContainsAny(lower, "month", "месяц"))
        {
            return "month";
        }

        return "day";
    }

    private static (DateTime? StartDate, DateTime? EndDate) ResolveCandlestickRangeUtc(string lower)
    {
        var now = DateTime.UtcNow;
        if (ContainsAny(lower, "прошл", "last") && ContainsAny(lower, "год", "year"))
        {
            return (now.AddYears(-1), now);
        }

        if (ContainsAny(lower, "прошл", "last") && ContainsAny(lower, "месяц", "month"))
        {
            return (now.AddMonths(-1), now);
        }

        return (null, null);
    }

    private static string BuildCandlestickMarkdownBlock(
        string ticker,
        int period,
        string rperiod,
        DateTime? startDate,
        DateTime? endDate,
        string mode,
        string? linkLabel = null)
    {
        var payload = new JsonObject
        {
            ["type"] = "candlestick",
            ["ticker"] = ticker,
            ["period"] = Math.Clamp(period, 0, 1440),
            ["rperiod"] = string.IsNullOrWhiteSpace(rperiod) ? "day" : rperiod.Trim().ToLowerInvariant(),
            ["mode"] = string.IsNullOrWhiteSpace(mode) ? "candles" : mode.Trim().ToLowerInvariant()
        };

        if (startDate.HasValue)
        {
            payload["startDate"] = startDate.Value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);
        }

        if (endDate.HasValue)
        {
            payload["endDate"] = endDate.Value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);
        }

        if (!string.IsNullOrWhiteSpace(linkLabel))
        {
            payload["linkLabel"] = linkLabel.Trim();
        }

        var json = payload.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = true
        });

        return $"```candlestick\n{json}\n```";
    }

    private static string BuildMarkowitzPiePayloadJson(IEnumerable<MarkowitzChartLine> chart, string title)
    {
        var data = new JsonArray();
        foreach (var item in chart)
        {
            data.Add(new JsonObject
            {
                ["name"] = item.Ticker,
                ["value"] = decimal.Round(item.Percent, 4)
            });
        }

        var payload = new JsonObject
        {
            ["type"] = "pie",
            ["title"] = title,
            ["unit"] = "%",
            ["donut"] = true,
            ["data"] = data
        };

        return payload.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = true
        });
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

        if (string.IsNullOrWhiteSpace(options.HttpAuthTokenEnvVar))
        {
            options.HttpAuthTokenEnvVar = "MCP_SERVER_AUTH_TOKEN";
        }

        if (string.IsNullOrWhiteSpace(options.HttpAuthHeaderName))
        {
            options.HttpAuthHeaderName = "Authorization";
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

    private bool TryAuthorizeHttpMcpRequest(out IActionResult? error)
    {
        error = null;
        var options = ResolveOptions();
        if (!options.EnableHttpEndpoint)
        {
            error = NotFound();
            return false;
        }

        var expectedToken = TryResolveHttpMcpAuthToken(options);
        if (string.IsNullOrWhiteSpace(expectedToken))
        {
            error = StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "MCP HTTP endpoint token is not configured.",
                code = "mcp_http_auth_not_configured"
            });
            return false;
        }

        if (!TryExtractHttpMcpRequestToken(options, out var providedToken) ||
            !string.Equals(providedToken, expectedToken, StringComparison.Ordinal))
        {
            error = Unauthorized(new
            {
                error = "Invalid MCP auth token.",
                code = "mcp_http_auth_invalid"
            });
            return false;
        }

        return true;
    }

    private bool TryExtractHttpMcpRequestToken(McpBridgeOptions options, out string token)
    {
        token = string.Empty;
        var headerName = string.IsNullOrWhiteSpace(options.HttpAuthHeaderName)
            ? "Authorization"
            : options.HttpAuthHeaderName.Trim();

        if (Request.Headers.TryGetValue(headerName, out var headerValues))
        {
            var raw = headerValues.FirstOrDefault()?.Trim();
            if (!string.IsNullOrWhiteSpace(raw))
            {
                if (raw.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    token = raw["Bearer ".Length..].Trim();
                }
                else
                {
                    token = raw;
                }

                if (!string.IsNullOrWhiteSpace(token))
                {
                    return true;
                }
            }
        }

        if (Request.Headers.TryGetValue("X-MCP-AUTH", out var fallbackValues))
        {
            var raw = fallbackValues.FirstOrDefault()?.Trim();
            if (!string.IsNullOrWhiteSpace(raw))
            {
                token = raw;
                return true;
            }
        }

        return false;
    }

    private static string? TryResolveHttpMcpAuthToken(McpBridgeOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.HttpAuthTokenEnvVar))
        {
            var fromEnv = Environment.GetEnvironmentVariable(options.HttpAuthTokenEnvVar.Trim());
            if (!string.IsNullOrWhiteSpace(fromEnv))
            {
                return fromEnv.Trim();
            }
        }

        if (!string.IsNullOrWhiteSpace(options.HttpAuthToken))
        {
            return options.HttpAuthToken.Trim();
        }

        return null;
    }

    private static bool IsSupportedHttpMcpMethod(string method)
    {
        return string.Equals(method, "tools/list", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(method, "tools/call", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(method, "resources/list", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(method, "resources/templates/list", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(method, "resources/read", StringComparison.OrdinalIgnoreCase);
    }

    private IActionResult CreateJsonRpcHttpResponse(JsonObject response)
    {
        var acceptHeader = Request.Headers.Accept.ToString();
        if (!string.IsNullOrWhiteSpace(acceptHeader) &&
            acceptHeader.Contains("text/event-stream", StringComparison.OrdinalIgnoreCase))
        {
            var eventPayload = $"data: {SerializeOneLine(response)}\n\n";
            return Content(eventPayload, "text/event-stream", Encoding.UTF8);
        }

        return Content(SerializeOneLine(response), "application/json", Encoding.UTF8);
    }

    private static JsonObject CreateJsonRpcErrorResponse(JsonNode? id, int code, string message, JsonNode? data = null)
    {
        var errorNode = new JsonObject
        {
            ["code"] = code,
            ["message"] = message
        };
        if (data != null)
        {
            errorNode["data"] = data.DeepClone();
        }

        return new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"] = id?.DeepClone(),
            ["error"] = errorNode
        };
    }

    private static JsonObject CreateJsonRpcResultResponse(JsonNode? id, JsonNode? result)
    {
        return new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"] = id?.DeepClone(),
            ["result"] = result?.DeepClone() ?? new JsonObject()
        };
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
        public Guid? ConversationId { get; set; }
        public List<McpChatHistoryItem>? History { get; set; }

        [JsonIgnore]
        public string? ProviderConversationId { get; set; }

        [JsonIgnore]
        public string? ProviderLastResponseId { get; set; }

        [JsonIgnore]
        public string? ProviderApiMode { get; set; }
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
        public string? ProviderRunId { get; set; }
        public string? ProviderConversationId { get; set; }
        public string? OrchestratorPhase { get; set; }
        public List<string>? OrchestratorWarnings { get; set; }
        public Guid? ConversationId { get; set; }
        public string? ConversationTitle { get; set; }
        public string Answer { get; set; } = string.Empty;
        public string? ExecutedTool { get; set; }
        public JsonNode? Arguments { get; set; }
        public JsonNode? Data { get; set; }
        public JsonNode? Trace { get; set; }
        public string? Stderr { get; set; }
        public List<string>? Warnings { get; set; }
        public List<string>? Suggestions { get; set; }
    }

    public sealed class McpCreateConversationRequest
    {
        public string? Title { get; set; }
    }

    public sealed class McpConversationSummary
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = DefaultConversationTitle;
        public string? LastMessagePreview { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int MessageCount { get; set; }
    }

    public sealed class McpConversationDetails
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = DefaultConversationTitle;
        public string? LastMessagePreview { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? ProviderApiMode { get; set; }
        public string? ProviderConversationId { get; set; }
        public string? ProviderLastResponseId { get; set; }
        public List<McpConversationMessageView> Messages { get; set; } = [];
    }

    public sealed class McpConversationMessageView
    {
        public long Id { get; set; }
        public string Role { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string? Provider { get; set; }
        public string? Model { get; set; }
        public string? ProviderMessageId { get; set; }
        public bool IsError { get; set; }
        public JsonNode? Data { get; set; }
        public List<string>? Suggestions { get; set; }
        public DateTime Timestamp { get; set; }
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
        public bool EnableHttpEndpoint { get; set; } = true;
        public string? HttpAuthToken { get; set; }
        public string HttpAuthTokenEnvVar { get; set; } = "MCP_SERVER_AUTH_TOKEN";
        public string HttpAuthHeaderName { get; set; } = "Authorization";
    }

    private sealed class McpProviderOptions
    {
        public string Provider { get; set; } = LocalProviderName;
        public McpOpenAiOptions OpenAi { get; set; } = new();
    }

    private sealed class McpOpenAiOptions
    {
        public bool Enabled { get; set; } = true;
        public string ApiMode { get; set; } = OpenAiApiModeResponsesCustomTools;
        public string? ApiKey { get; set; }
        public string ApiKeyEnvVar { get; set; } = "OPENAI_API_KEY";
        public string BaseUrl { get; set; } = "https://api.openai.com/v1";
        public string Model { get; set; } = "gpt-4o-mini";
        public string? Organization { get; set; }
        public string? Project { get; set; }
        public bool UseConversationsApi { get; set; }
        public string? ReasoningEffort { get; set; }
        public int TimeoutSeconds { get; set; } = 90;
        public double Temperature { get; set; } = 0.2;
        public int MaxCompletionTokens { get; set; } = 1200;
        public int MaxOutputTokens { get; set; }
        public int MaxToolIterations { get; set; } = 8;
        public string? SystemPrompt { get; set; }
        public List<McpOpenAiNativeMcpServerOptions> NativeMcpServers { get; set; } = [];
    }

    private sealed class McpOpenAiNativeMcpServerOptions
    {
        public string? ServerLabel { get; set; }
        public string? ServerUrl { get; set; }
        public string? ServerDescription { get; set; }
        public string? RequireApproval { get; set; }
        public List<string>? AllowedTools { get; set; }
        public Dictionary<string, string>? Headers { get; set; }
    }

    private sealed class OpenAiChatResult
    {
        public bool IsSuccess { get; private init; }
        public JsonObject? AssistantMessage { get; private init; }
        public JsonNode? RawResponse { get; private init; }
        public string? FinishReason { get; private init; }
        public JsonObject? Error { get; private init; }

        public static OpenAiChatResult Success(JsonObject assistantMessage, JsonNode? rawResponse, string? finishReason)
        {
            return new OpenAiChatResult
            {
                IsSuccess = true,
                AssistantMessage = assistantMessage,
                RawResponse = rawResponse,
                FinishReason = finishReason
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

    private sealed class OpenAiResponsesResult
    {
        public bool IsSuccess { get; private init; }
        public JsonNode? RawResponse { get; private init; }
        public string? FinishReason { get; private init; }
        public string? ResponseId { get; private init; }
        public string? ConversationId { get; private init; }
        public JsonObject? Error { get; private init; }

        public static OpenAiResponsesResult Success(
            JsonNode rawResponse,
            string? finishReason,
            string? responseId,
            string? conversationId)
        {
            return new OpenAiResponsesResult
            {
                IsSuccess = true,
                RawResponse = rawResponse,
                FinishReason = finishReason,
                ResponseId = responseId,
                ConversationId = conversationId
            };
        }

        public static OpenAiResponsesResult Fail(string message, JsonObject? details = null)
        {
            return new OpenAiResponsesResult
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
