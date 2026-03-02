# ТЗ: поддержка `bar`, `pie` и `candlestick` chart-блоков в MCP Console по markdown-спецификации

Дата: 2026-02-19  
Статус: к реализации  
Проект: `C:\sc\schart`

## 1. Контекст и проблема

Текущее состояние:

1. `Angular/mat/src/app/service/markdown-renderer.service.ts` рендерит markdown через `marked` и KaTeX, но не поддерживает chart-блоки.
2. `Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.ts` хранит в сообщении один HTML-блок (`renderedHtml`) и не умеет смешанный рендер `markdown + chart`.
3. `tools/mcp_adapter/stockchart_mcp_server.py` не публикует отдельную markdown-спецификацию чартов для LLM/MCP-хоста.
4. В `StockChart/Controllers/McpController.cs` есть правило про markdown-таблицы, но нет нормализованного контракта на chart-блоки.
5. Для свечных графиков нет стандартного формата, который бы приводил к созданию ссылки на внутренний маршрут сервиса (`/CandlestickChart`).

Итог: даже если модель возвращает описание графика в markdown, MCP Console не гарантирует корректное отображение `bar/pie`, а для `candlestick` не формирует ссылку на график внутри сервиса.

## 2. Цель

Реализовать end-to-end поддержку `bar/pie` визуализаций и `candlestick`-блока со ссылкой внутри сервиса:

1. MCP-слой публикует и использует единую спецификацию chart-блоков.
2. Backend-подсказки для модели приводят к стабильному формату `bar/pie/candlestick`.
3. Frontend-консоль парсит такие блоки и:
   - рендерит `bar/pie` как графики,
   - формирует для `candlestick` внутреннюю ссылку на `/CandlestickChart` с параметрами.
4. При невалидном блоке отображается безопасный fallback (обычный markdown-код).

## 3. Границы

Входит в ТЗ:

1. `bar`, `pie` и `candlestick` типы.
2. Изменения в MCP adapter + `McpController` + MCP Console UI.
3. Валидация, fallback, логирование, тесты.

Не входит в ТЗ:

1. Поддержка `line/scatter/heatmap`.
2. Генерация графиков из произвольных markdown-таблиц без chart-блока.
3. Редизайн MCP Console.
4. Изменение контракта `POST /api/mcp/chat` с breaking changes.

## 4. Целевая архитектура

## 4.1 Поток данных

1. Модель/оркестратор возвращает текст ответа в markdown.
2. В тексте могут присутствовать fenced code block с языком `chart`, `bar`, `pie`, `candlestick`, `candle`.
3. MCP Console парсит markdown на блоки:
   - markdown-блоки (как сейчас),
   - chart-блоки (`bar|pie`),
   - chart-link блоки (`candlestick`).
4. `bar/pie` конвертируются в `EChartsOption` и рендерятся через `ngx-echarts`.
5. `candlestick` конвертируется в внутреннюю ссылку на страницу графика сервиса.
6. При ошибке парсинга блок рендерится как обычный `pre/code` + warning-текст.

## 4.2 Принцип совместимости

1. Старые ответы без chart-блоков отображаются без изменений.
2. API-контракты `GET/POST /api/mcp/*` сохраняются.
3. Chart-блоки добавляются как расширение markdown, не как отдельный обязательный JSON-поле.

## 5. Нормативная markdown-спецификация chart-блоков

## 5.1 Поддерживаемые fenced blocks

Поддерживаются info-string:

1. ```chart
2. ```bar
3. ```pie
4. ```candlestick
5. ```candle

Регистр не учитывается (`chart|Chart|CHART`).

## 5.2 Формат содержимого

Содержимое chart-блока: только JSON-объект UTF-8.

Для `chart`:

1. Поле `type` обязательно (`"bar"`, `"pie"` или `"candlestick"`).

Для `bar|pie|candlestick|candle`:

1. `type` опционально.
2. Если `type` отсутствует, тип берется из info-string.
3. Для `candle` итоговый тип нормализуется к `candlestick`.

## 5.3 Общая схема (`bar/pie/candlestick`)

Поля:

1. `type: "bar" | "pie" | "candlestick"` (см. правило выше)
2. `title?: string` (до 120 символов)
3. `subtitle?: string` (до 180 символов)
4. `unit?: string` (до 24 символов)
5. `source?: string` (до 120 символов)
6. `palette?: string[]` (опционально, до 20 цветов; применимо к `bar/pie`)

## 5.4 Схема `bar`

Допустим один из форматов данных:

1. `labels: string[]` + `values: number[]` (длины равны)
2. `data: [{ "name": string, "value": number }, ...]`

Опции:

1. `horizontal?: boolean` (default: `true`)
2. `sort?: "none" | "asc" | "desc"` (default: `none`)
3. `maxItems?: number` (опционально, но итогово не больше системного лимита)

Ограничения:

1. 1..30 элементов.
2. Значения только конечные числа (`Number.isFinite`).
3. Отрицательные значения разрешены.

## 5.5 Схема `pie`

Данные:

1. `data: [{ "name": string, "value": number }, ...]` (обязательно)

Опции:

1. `donut?: boolean` (default: `false`)
2. `showPercent?: boolean` (default: `true`)
3. `roseType?: "none" | "radius" | "area"` (default: `none`)

Ограничения:

1. 1..20 элементов.
2. Значения только конечные числа.
3. Значения должны быть `>= 0`.
4. Сумма значений должна быть `> 0`.

## 5.6 Схема `candlestick` (формирование ссылки внутри сервиса)

Данные:

1. `ticker: string` (обязательно, до 32 символов; `A-Z0-9._-`)

Опции:

1. `period?: number` (default: `1`, диапазон `0..1440`)
2. `rperiod?: string` (default: `day`; допустимые: `day|week|month`)
3. `startDate?: string` (ISO 8601)
4. `endDate?: string` (ISO 8601)
5. `mode?: string` (default: `candles`; разрешено только `candles`)
6. `linkLabel?: string` (текст кнопки/ссылки, до 80 символов)

Правила формирования ссылки:

1. Базовый путь фиксирован: `/CandlestickChart`.
2. Ссылка формируется только внутри сервиса (relative URL без host/scheme).
3. Query-параметры: `ticker`, `period`, `rperiod`, `startDate`, `endDate`, `mode`.
4. Поля `url`, `href`, `host`, `path` из payload игнорируются.
5. Если `ticker` невалидный, блок считается ошибочным (`chart_error` fallback).

Пример результата:

1. `/CandlestickChart?ticker=SBER&period=1&rperiod=day&mode=candles`

## 5.7 Примеры

Пример `bar`:

```bar
{
  "title": "Топ-5 бумаг по весу",
  "unit": "%",
  "data": [
    { "name": "SBER", "value": 40.0 },
    { "name": "GAZP", "value": 22.5 },
    { "name": "LKOH", "value": 14.7 }
  ],
  "sort": "desc",
  "horizontal": true
}
```

Пример `pie`:

```pie
{
  "title": "Структура портфеля",
  "unit": "%",
  "donut": true,
  "data": [
    { "name": "SBER", "value": 40.0 },
    { "name": "GAZP", "value": 22.5 },
    { "name": "LKOH", "value": 14.7 }
  ]
}
```

Пример `candlestick`:

```candlestick
{
  "title": "Свечной график SBER",
  "ticker": "SBER",
  "period": 1,
  "rperiod": "day",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2026-02-01T00:00:00Z",
  "mode": "candles",
  "linkLabel": "Открыть свечной график"
}
```

## 6. Требования к MCP-серверной части

## 6.1 `tools/mcp_adapter/stockchart_mcp_server.py`

Обязательные изменения:

1. Добавить статический ресурс `stockchart://docs/markdown-charts` (`mimeType: text/markdown`).
2. Добавить генератор содержимого спецификации (аналог `_docs_tooling_markdown`), включающий разделы из п.5.
3. Обновить `stockchart://docs/tooling`: добавить ссылку на `stockchart://docs/markdown-charts`.
4. Обработать `resources/read` для `stockchart://docs/markdown-charts`.
5. Поднять `serverInfo.version` (например `0.4.0`).

Нефункционально:

1. Никаких breaking changes в `tools/call`.
2. Сохранить ответ tools в `content[type=text]` как сейчас.

## 6.2 `StockChart/Controllers/McpController.cs`

Обязательные изменения:

1. Расширить системный prompt инструкцией по chart-блокам:
   - для сравнений/структуры использовать `bar|pie`,
   - для запроса свечного графика использовать `candlestick`-блок по spec.
2. Расширить finalize prompts (`TryFinalizeOpenAiAnswerWithoutToolsAsync`, `TryFinalizeOpenAiAnswerWithoutToolsViaResponsesAsync`) тем же правилом.
3. Обновить `/help`-ответ, добавив подсказку по `bar/pie/candlestick`.
4. Для локального сценария Марковица (ветка с `portfolio_markowitz`) добавить генерацию markdown `pie`-блока в `Answer` при наличии `chart`.
5. Для сценариев, где уместна свечная навигация, разрешить возврат `candlestick`-блока вместо сырого URL.

Требование совместимости:

1. Chart-блок должен идти после таблицы/краткого вывода, чтобы старые клиенты не потеряли читаемость.
2. При невозможности построить chart-блок текстовый ответ остается валидным.

## 6.3 Контракт API

`POST /api/mcp/chat` не меняется по схеме:

1. `answer` остается строкой markdown.
2. `data/trace/warnings` остаются без breaking изменений.
3. Дополнительные поля допустимы только как опциональные.

## 7. Требования к frontend MCP Console

## 7.1 Изменения модели сообщения

`Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.ts`:

1. Заменить модель `renderedHtml` на список render-блоков:
   - `markdown` (SafeHtml),
   - `chart` (тип + `EChartsOption` + метаданные, только `bar/pie`),
   - `chart_link` (тип `candlestick`, label, url, params),
   - `chart_error` (fallback-сообщение + raw блок).

Пример интерфейсов:

1. `ChatRenderBlockMarkdown`
2. `ChatRenderBlockChart`
3. `ChatRenderBlockChartLink`
4. `ChatRenderBlockChartError`

## 7.2 Парсинг markdown

`Angular/mat/src/app/service/markdown-renderer.service.ts`:

1. Вынести пайплайн в 2 шага:
   - `extractChartBlocks(markdown)`,
   - `renderMarkdownWithMath(remainingMarkdown)`.
2. Поиск fenced code block `chart|bar|pie|candlestick|candle`.
3. Парсинг JSON через `JSON.parse` с try/catch.
4. Валидация по правилам п.5.
5. При успехе:
   - для `bar/pie` формировать `ChartSpec`,
   - для `candlestick` формировать объект ссылки (`ChartLinkSpec`).
6. При ошибке формировать `chart_error` и сохранять сырой текст блока.

## 7.3 Построение ECharts options и ссылок

Добавить отдельные сервисы:

1. `Angular/mat/src/app/service/mcp-chart-renderer.service.ts` (`ChartSpec -> EChartsOption`)
2. `Angular/mat/src/app/service/mcp-chart-link-builder.service.ts` (`CandlestickSpec -> internal URL`)

Требования:

1. `bar/pie` конвертируются в `EChartsOption`.
2. `candlestick` генерирует ссылку только на `/CandlestickChart`.
3. Query-параметры кодируются (`encodeURIComponent` / Router serializer).
4. Никаких eval/function из пользовательских данных.
5. Единый стиль цветов и типографики MCP Console.
6. Tooltip, legend, адаптивная высота.

## 7.4 Шаблон и стили

`Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.html`:

1. Для assistant/error/system сообщений рендерить блоки в исходном порядке.
2. Для `markdown` использовать `[innerHTML]`.
3. Для `chart` использовать контейнер `<div echarts [options]="...">`.
4. Для `chart_link` показывать кнопку/ссылку:
   - текст из `linkLabel` или default `Открыть свечной график`,
   - `href` на сформированный внутренний URL,
   - `target="_blank"` + `rel="noopener"`.
5. Для `chart_error` показывать warning и исходный код в `pre`.

`Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.css`:

1. Добавить стили `.message-chart`, `.message-chart-canvas`, `.message-chart-header`, `.message-chart-link`, `.message-chart-error`.
2. Desktop высота графика: 260..320px.
3. Mobile высота графика: 220..260px.
4. Ограничить переполнение по ширине.

## 7.5 UX/поведение

1. Сообщение может содержать несколько графиков/ссылок.
2. При длинных категориях подписи не ломают layout.
3. При `chart_error` пользователь видит причину и raw block.
4. Копирование сообщения (`copyMessage`) копирует исходный `text`, без потери markdown.
5. Для `candlestick` пользователь открывает график в отдельной вкладке внутри того же сервиса.

## 8. Безопасность

1. Chart-блок принимается только как JSON-объект; YAML/JS запрещены.
2. Строковые поля ограничиваются по длине и очищаются от управляющих символов.
3. Запрещены внешние URL/скрипты/formatter функции в payload.
4. Для `candlestick` запрещены внешние домены и произвольные path.
5. При любых ошибках парсинга используется безопасный fallback.
6. Существующая sanitization-модель markdown должна быть сохранена или усилена.

## 9. Логирование и диагностика

Backend:

1. Логировать факт применения chart-инструкции в оркестраторе (debug).
2. Логировать количество ответов с `bar/pie/candlestick` блоками (info/metric).

Frontend:

1. Считать:
   - `mcp_chart_parse_ok`,
   - `mcp_chart_parse_error`,
   - `mcp_chart_render_error`,
   - `mcp_chart_link_build_ok`,
   - `mcp_chart_link_build_error`,
   - `mcp_chart_link_click`.
2. Логировать только тех.данные без пользовательских секретов.

## 10. План внедрения

Этап 1 (backend spec + prompts):

1. Реализовать ресурс `stockchart://docs/markdown-charts`.
2. Обновить prompt-инструкции в `McpController`.
3. Добавить chart-блок в локальный Markowitz-ответ.

Этап 2 (frontend parser + render + link):

1. Ввести новую модель render-блоков.
2. Реализовать parser/validator/chart-mapper и builder внутренних ссылок для `candlestick`.
3. Обновить шаблон и стили MCP Console.

Этап 3 (стабилизация):

1. Автотесты.
2. Smoke e2e на `/api/mcp/chat`.
3. Сбор метрик/ошибок и корректировка лимитов.

## 11. Тестирование

## 11.1 Unit (frontend)

1. Валидный `bar` (`labels+values`).
2. Валидный `pie` (`data[]`).
3. Валидный `candlestick` -> формируется ссылка на `/CandlestickChart`.
4. `chart` без `type` -> ошибка.
5. `pie` с отрицательным значением -> ошибка.
6. `candlestick` без `ticker` -> ошибка.
7. Разные регистры info-string.
8. Сообщение с mixed-контентом (текст + график + candlestick-ссылка + код).

## 11.2 Unit (backend)

1. `resources/list` содержит `stockchart://docs/markdown-charts`.
2. `resources/read` возвращает markdown-спецификацию.
3. Prompt-сборка включает `bar/pie/candlestick` правила.
4. Markowitz-ветка добавляет `pie` блок при наличии данных.

## 11.3 Integration

1. `/api/mcp/chat` возвращает answer с `bar/pie/candlestick` блоком.
2. Сообщение сохраняется/читается из истории без потери markdown.
3. MCP Console корректно восстанавливает графики и candlestick-ссылки из истории диалога.

## 12. Критерии приемки

1. Если в `answer` есть валидный `bar` или `pie` блок, он отображается графиком в MCP Console.
2. Если в `answer` есть валидный `candlestick` блок, отображается рабочая ссылка на внутренний маршрут `/CandlestickChart` с query-параметрами.
3. Порядок блоков в сообщении совпадает с markdown.
4. При невалидном chart-блоке UI не падает, выводится fallback.
5. Ответы без chart-блоков отображаются как раньше.
6. `GET /mcp` и `POST /mcp` продолжают работать без регрессий.
7. Время рендера одного сообщения с 1 графиком/ссылкой не ухудшается более чем на 20% относительно baseline.

## 13. Риски и меры

Риск:

1. Модель генерирует невалидный JSON в chart-блоках.

Мера:

1. Строгая валидация + fallback + prompt-примеры.

Риск:

1. Слишком большие наборы данных ломают мобильный layout.

Мера:

1. Лимиты элементов (30/20), авто-обрезка и предупреждение.

Риск:

1. Некорректные параметры в `candlestick` приводят к битой ссылке.

Мера:

1. Строгая валидация `ticker/period/rperiod/date`, сборка URL только через фиксированный маршрут.

Риск:

1. XSS через markdown/chart payload.

Мера:

1. Запрет скриптовых полей, строгий JSON parser, безопасный рендер.

## 14. Артефакты изменения (план по файлам)

Обязательно:

1. `tools/mcp_adapter/stockchart_mcp_server.py`
2. `tools/mcp_adapter/README.md`
3. `StockChart/Controllers/McpController.cs`
4. `Angular/mat/src/app/service/markdown-renderer.service.ts`
5. `Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.ts`
6. `Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.html`
7. `Angular/mat/src/app/components/pages/mcp-console/mcp-console.component.css`

Опционально:

1. `Angular/mat/src/app/service/mcp-chart-renderer.service.ts` (новый)
2. `Angular/mat/src/app/service/mcp-chart-link-builder.service.ts` (новый)
3. unit/integration test файлы для frontend/backend
