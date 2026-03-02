# ТЗ: переход MCP-консоли на современный OpenAI API (Responses + Conversations + MCP)

Дата: 2026-02-12  
Статус: к реализации  
Проект: `C:\sc\schart`

## 1. Контекст и проблема

Текущая реализация MCP-консоли в `StockChart/Controllers/McpController.cs` использует:

1. `POST /v1/chat/completions` напрямую;
2. ручной цикл tool-calls;
3. локальный MCP bridge через `tools/mcp_adapter/stockchart_mcp_server.py` (stdio).

На практике наблюдались сбои сценариев:

1. повторные уточнения вместо выполнения;
2. `fallback_no_text`/`limit_finalize`;
3. много успешных tool-вызовов без финального ответа.

Цель: перейти на современный API-подход OpenAI для агентных сценариев, с полноценной поддержкой MCP и предсказуемым финальным ответом.

## 2. Основания для миграции (актуально на 2026-02-12)

По официальной документации OpenAI:

1. Responses API является целевым направлением для агентных интеграций.
2. Chat Completions остается поддерживаемым, что позволяет инкрементальную миграцию.
3. Assistants API депрекейтед, shutdown: **2026-08-26**.
4. В Responses/Conversations есть native сущности для tool loop, conversation state и MCP.

## 3. Цель и границы

## 3.1 Цель

Реализовать устойчивый контур:

1. `Frontend MCP Console -> /api/mcp/chat`
2. `McpController -> Responses Orchestrator`
3. `Responses API -> MCP tools -> финальный ответ без циклов`

с сохранением текущего UX и контрактов клиентского API.

## 3.2 Не входит в ТЗ

1. Полная замена всех остальных OpenAI-интеграций в проекте.
2. Редизайн UI.
3. Массовая переработка предметных MCP tools (если не требуется для совместимости).

## 4. Целевое архитектурное решение

## 4.1 Архитектурный принцип

Ввести отдельный слой оркестрации OpenAI:

1. `IOpenAiResponsesClient` — транспорт к `POST /v1/responses` и Conversations API.
2. `ResponsesOrchestrator` — state machine исполнения.
3. `McpToolExecutionService` — исполнение tools (native MCP или существующий bridge).

`McpController` должен остаться тонким API-слоем.

## 4.2 Режимы работы (feature flag)

Добавить режимы в конфиг:

1. `chat_completions_legacy` (текущий, fallback).
2. `responses_custom_tools` (быстрый безопасный этап).
3. `responses_native_mcp` (целевой режим).

Режим выбирается по `McpProvider:OpenAi:ApiMode`.

## 4.3 Целевой режим (финальный)

`responses_native_mcp`:

1. Запросы идут через Responses API.
2. OpenAI получает MCP server как tool типа `mcp`.
3. Conversation state ведется через Conversations API (не вручную через длинный history).
4. Для read-only tools политика approval: `never`.
5. Для write-инструментов — обязательное подтверждение (или запрет на этапе 1).

## 5. Требования к серверной части

## 5.1 Конфигурация

Расширить `McpProvider:OpenAi`:

1. `ApiMode` (`chat_completions_legacy|responses_custom_tools|responses_native_mcp`)
2. `UseConversationsApi` (`true|false`)
3. `MaxOutputTokens`
4. `ReasoningEffort` (`low|medium|high`, если поддерживается моделью)
5. `MaxToolIterations` (увеличить верхнюю границу до 24)
6. `NativeMcpServers[]`:
   - `ServerLabel`
   - `ServerUrl`
   - `ServerDescription`
   - `AllowedTools[]`
   - `RequireApproval` (`always|never|filter`)
   - `Headers` (секреты через env/secret store, не в appsettings)

## 5.2 Контракты `/api/mcp/*`

Сохранить без breaking changes:

1. `POST /api/mcp/chat` (основной)
2. `GET /api/mcp/tools`
3. `POST /api/mcp/tool-call`
4. `POST /api/mcp/rpc`

Дополнить payload ответа `chat`:

1. `providerRunId` (response id OpenAI)
2. `providerConversationId` (если Conversations API)
3. `orchestratorPhase` (`planning|tooling|finalizing`)
4. `orchestratorWarnings[]`

## 5.3 Оркестратор (обязательная логика)

Реализовать конечный автомат:

1. `Start`: отправка input в Responses.
2. `CollectOutputs`: разбор output items.
3. `HandleToolCalls`: выполнение tool-call items.
4. `SubmitToolOutputs`: отправка `*_call_output`.
5. `Finalize`: детект финального текста.
6. `FailSafe`: controlled fallback.

Правила остановки:

1. Есть финальный текст и нет pending tool calls.
2. Достигнут лимит итераций -> принудительный `finalize` без tools.
3. Пустой финал -> fallback по tool data (как сейчас), но с отдельным кодом `OPENAI_EMPTY_FINAL`.

## 5.4 Антизацикливание (обязательно)

Сохранить и развить текущую защиту:

1. детектор уточняющих циклов;
2. ограничение повторных clarifications (не более 2);
3. при сигнале пользователя "делай/вперед/без вопросов" — запрет на follow-up;
4. forced-final answer policy при повторе паттерна.

## 5.5 Хранение состояния диалога

Добавить в БД (миграция):

В `McpConversations`:

1. `ProviderConversationId` (`nvarchar(128)`, null)
2. `ProviderLastResponseId` (`nvarchar(128)`, null)
3. `ProviderStateJson` (`nvarchar(max)`, null)
4. `ProviderApiMode` (`nvarchar(64)`, null)

В `McpConversationMessages`:

1. `ProviderMessageId` (`nvarchar(128)`, null)
2. `TraceJson` (`nvarchar(max)`, null) — нормализованный trace по output items.

## 5.6 Ошибки и коды

Ввести стандартные коды для клиента:

1. `subscription_required` (уже есть)
2. `openai_rate_limited`
3. `openai_invalid_response`
4. `openai_empty_final`
5. `mcp_tool_timeout`
6. `mcp_tool_validation_error`
7. `mcp_approval_required`
8. `mcp_server_unreachable`

HTTP mapping:

1. 400 — ошибка входных параметров
2. 401 — не авторизован
3. 403 — нет подписки/approval policy
4. 429 — rate limit
5. 502 — upstream/provider/tool bridge
6. 504 — timeout

## 6. Требования к MCP-слою

## 6.1 Краткосрочно (без риска)

Оставить существующий `tools/mcp_adapter/stockchart_mcp_server.py` (stdio) и использовать его в `responses_custom_tools`.

## 6.2 Целевой MCP-native

Поднять отдельный HTTP MCP endpoint (streamable HTTP), совместимый с remote MCP tool в Responses API:

1. путь: `https://<host>/mcp`
2. auth: bearer token + IP allow-list
3. read-only tools помечены соответствующими аннотациями
4. write tools выключены на первом этапе
5. журналирование вызовов и request id

Важно: native MCP в Responses требует доступности server_url для OpenAI (локальный `stdio` напрямую не подойдет).

## 6.3 Безопасность MCP

Обязательно:

1. allowlist инструментов (`AllowedTools`)
2. минимизация передаваемых данных (no secrets in tool args)
3. prompt injection hardening в system prompt и server policy
4. отдельный audit log для всех MCP вызовов

## 7. Требования к frontend

`Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.ts`:

1. обрабатывать новые коды ошибок;
2. отображать этапы оркестратора (`iteration/plan/tool/finalize`);
3. для `mcp_approval_required` показывать диалог approve/reject;
4. не терять совместимость со старым `trace` форматом.

UI-поведение:

1. ссылка на консоль видна всем (уже сделано);
2. неавторизован -> login;
3. без подписки -> диалог + `/Payment` (уже сделано);
4. при новых кодах ошибок — понятный текст + технические детали в trace.

## 8. Миграционный план

## 8.1 Этап 0: подготовка

1. Вынести OpenAI-вызовы из `McpController` в сервис.
2. Добавить метрики и структурные логи.
3. Добавить флаг `ApiMode`.

Критерий: текущий режим работает без изменений.

## 8.2 Этап 1: Responses + custom tools

1. Подключить `POST /v1/responses`.
2. Сохранить исполнение tools на своей стороне (через существующий bridge).
3. Включить новый state machine.

Критерий: одинаковые или лучшие ответы на regression-наборе, без роста ошибок.

## 8.3 Этап 2: Conversations API

1. Хранить `providerConversationId`.
2. Перевести диалоги с ручного history на conversation-based state.
3. Добавить миграцию существующих диалогов (best effort).

Критерий: длинные сессии стабильны, payload в запросах уменьшился.

## 8.4 Этап 3: Native MCP

1. Развернуть HTTP MCP server.
2. Подключить `tools: [{ type: \"mcp\", ... }]`.
3. Настроить `require_approval` policy.

Критерий: end-to-end через native MCP без деградации относительно этапа 1.

## 8.5 Этап 4: rollout

1. Canary (10% подписчиков).
2. 50%.
3. 100%.
4. Legacy режим оставить как rollback на 2 релиза.

## 9. Нефункциональные требования

1. p95 время ответа в диалоге: не хуже текущего +20%.
2. Доля пустых финалов (`openai_empty_final`): < 1%.
3. Доля циклов уточнений >2 подряд: < 0.5%.
4. Успешность tool execution: > 98% (исключая валидационные ошибки пользователя).
5. Полная трассировка каждого ответа в БД + structured logs.

## 10. Тестирование и приемка

## 10.1 Unit

1. Парсер output items Responses.
2. Анти-цикловая эвристика.
3. Маппинг ошибок в HTTP/status codes.

## 10.2 Integration

1. `Responses -> custom tool -> call_output -> final`.
2. Таймауты tools.
3. Некорректные аргументы tools.
4. Потеря connectivity с OpenAI.

## 10.3 E2E (обязательные сценарии)

1. "определи нефтяные компании их добычу нефти и дивиденды" -> итоговая таблица без повторных подтверждений.
2. "сравни финансовые показатели за 3 года" -> таблица в ответе без зацикливания.
3. Пользователь без подписки -> 403 + диалог `/Payment`.
4. Неавторизованный -> redirect login.
5. Длинный диалог 20+ сообщений -> устойчивое состояние.

## 10.4 Критерии приемки

1. Все E2E проходят.
2. Новый режим включается флагом и обратим.
3. Клиентские контракты не сломаны.
4. Наблюдаемое снижение циклов и `fallback_no_text` минимум на 80% от текущего baseline.

## 11. Риски и меры

1. Риск: remote MCP недоступен извне.
   Мера: этап 1 через custom tools + fallback.
2. Риск: prompt injection в MCP данных.
   Мера: allowlist, read-only, policy checks, no sensitive context.
3. Риск: нестабильность нового провайдера/модели.
   Мера: feature flag + rollback.
4. Риск: рост стоимости токенов.
   Мера: conversation state, краткие tool payloads, hard caps.

## 12. Артефакты реализации

Обновить/добавить:

1. `StockChart/Controllers/McpController.cs` (тонкий контроллер, делегирование в оркестратор)
2. `StockChart/Services/OpenAi/ResponsesOrchestrator.cs`
3. `StockChart/Services/OpenAi/OpenAiResponsesClient.cs`
4. `StockChart/Services/Mcp/McpToolExecutionService.cs`
5. `StockChart.Data` миграции для provider state
6. `Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.ts`
7. `StockChart/appsettings*.json` (новые настройки)
8. `tools/mcp_adapter` (HTTP MCP endpoint для этапа 3)

## 13. Definition of Done

Задача считается закрытой, когда:

1. `responses_native_mcp` работает на production-окружении для подписчиков;
2. legacy режим доступен как rollback;
3. наблюдаемость покрывает весь путь запроса;
4. показатели качества (п.9) достигнуты в течение 7 дней после 100% rollout.

## 14. Ссылки на официальные источники

1. Deprecations: `https://platform.openai.com/docs/deprecations`
2. Migrate to Responses: `https://platform.openai.com/docs/guides/migrate-to-responses`
3. Responses vs Chat Completions: `https://platform.openai.com/docs/guides/responses-vs-chat-completions`
4. Assistants migration guide: `https://platform.openai.com/docs/assistants/how-it-works`
5. MCP guide: `https://platform.openai.com/docs/mcp`
6. Conversations API reference: `https://platform.openai.com/docs/api-reference/conversations`

