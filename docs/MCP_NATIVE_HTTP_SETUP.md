# MCP Native HTTP Setup (`/mcp`)

## 1. Что уже реализовано

1. HTTP MCP endpoint: `POST /mcp` (JSON-RPC) и `GET /mcp` (health/info).
2. Token auth для `POST /mcp`:
   - header по умолчанию: `Authorization: Bearer <token>`
   - fallback header: `X-MCP-AUTH: <token>`
3. Поддержка методов:
   - `initialize`
   - `tools/list`
   - `tools/call`
   - `resources/list`
   - `resources/templates/list`
   - `resources/read`
4. Responses native mode в `McpController`:
   - `ApiMode = responses_native_mcp`
   - `NativeMcpServers[]` -> tool type `mcp`

## 2. Конфигурация токена `/mcp`

Рекомендуется через env:

1. `MCP_SERVER_AUTH_TOKEN=<secret>`
2. В `McpBridge`:
   - `EnableHttpEndpoint=true`
   - `HttpAuthTokenEnvVar=MCP_SERVER_AUTH_TOKEN`
   - `HttpAuthHeaderName=Authorization`

Если `MCP_SERVER_AUTH_TOKEN` не задан, `/mcp` вернет `503` с кодом `mcp_http_auth_not_configured`.

## 3. Включение native MCP режима

В `McpProvider:OpenAi:OpenAi`:

1. `ApiMode = "responses_native_mcp"`
2. `NativeMcpServers` добавить сервер:

```json
[
  {
    "ServerLabel": "stockchart-mcp",
    "ServerUrl": "https://<your-public-host>/mcp",
    "RequireApproval": "never",
    "AllowedTools": [
      "list_markets",
      "search_stocks",
      "list_sectors",
      "list_industries",
      "list_metrics",
      "statements_available",
      "statement_series",
      "statement_series_batch",
      "candles_series",
      "candles_series_batch",
      "market_leaders",
      "volume_splash",
      "portfolio_markowitz",
      "fractal_barometer",
      "dividends"
    ],
    "Headers": {
      "Authorization": "Bearer <same token as MCP_SERVER_AUTH_TOKEN>"
    }
  }
]
```

Важно:

1. `ServerUrl` должен быть публично доступен для OpenAI (localhost не подходит).
2. Для продакшена использовать HTTPS.

## 4. Проверка

1. Health:
   - `GET https://<host>/mcp` -> `status=ok`.
2. MCP initialize:
   - `POST /mcp` с JSON-RPC `initialize` и bearer token.
3. MCP tools/list:
   - `POST /mcp` с `tools/list` и bearer token.
4. Chat:
   - `POST /api/mcp/chat` в режиме `responses_native_mcp`.

## 5. Миграция БД (provider state)

Перед запуском на окружении применить EF migration:

1. `dotnet ef database update --project StockChart.Data/StockChart.Data.csproj --startup-project StockChart/StockChart.csproj --context ApplicationDbContext`
2. Миграция: `20260212183810_mcp_provider_state`
3. Добавляет поля:
   - `McpConversations`: `ProviderConversationId`, `ProviderLastResponseId`, `ProviderStateJson`, `ProviderApiMode`
   - `McpConversationMessages`: `ProviderMessageId`, `TraceJson`
