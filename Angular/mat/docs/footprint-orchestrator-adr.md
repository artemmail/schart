# Footprint orchestrator ADR

## Текущие точки входа данных и событий
- **Данные диапазона и настройки.** `FootprintWidgetComponent` инициализирует загрузчик данныx, который подтягивает пресеты, разрешает настройки и обновляет `params$`/`settings$` перед запросом диапазона; результат кластеров публикуется через `data$`. Виджет подписывается на все три потока и перенаправляет их в рендерер (`applyData`, `applySettings`, `applyParams`).【F:src/app/components/footprint/footprint-data-loader.service.ts†L49-L109】【F:src/app/components/footprint/footprint-widget.component.ts†L164-L226】
- **Realtime.** `FootprintRealtimeUpdaterService` по конфигурации подписывается на SignalR-события, наблюдает видимость canvas и перенаправляет входящие кластеры/тики/ladder в `FootprintDataLoaderService.applyRealtimeUpdate`, который мерджит данные и публикует `updates$`; `FootprintWidgetComponent` передаёт их в `renderer.handleRealtimeUpdate` и предварительно бинлит канвас для отслеживания видимости.【F:src/app/components/footprint/footprint-realtime-updater.service.ts†L36-L188】【F:src/app/components/footprint/footprint-data-loader.service.ts†L76-L97】【F:src/app/components/footprint/footprint-widget.component.ts†L85-L206】
- **Параметры и перерисовка в рендерере.** `FootPrintComponent` принимает обновления параметров, настроек и датасета отдельными методами (`applyParams`, `applySettings`, `applyData`), каждый из которых проверяет готовность представления и вызывает цепочку `initSize` → `resize` → `drawClusterView`. Realtime-обновления вызывают `handleRealtimeUpdate`, который выполняет `mergeMatrix` при необходимости и перерисовывает вид.【F:src/app/components/footprint/footprint.component.ts†L441-L494】

## Целевой контракт слоя orchestrator
- **Входные события**
  - `rangeSnapshot(params, settings, data, presets?)` — результат серверного диапазона, включает актуальные параметры/настройки.
  - `settingsChanged(settings)` — новая конфигурация рендера без перезагрузки диапазона.
  - `paramsChanged(params)` — смена параметров виджета (ticker/period/step/режимы), требующая перерасчёта/догрузки.
  - `realtimeDelta(update)` — дельта от SignalR (cluster/ticks/ladder) поверх последнего снапшота.
  - `viewportResized(size)` — сигнал от ResizeObserver/host для пересчёта вью.
- **Выходные команды для renderer**
  - `applySnapshot({ params, settings, data, presets })` — единоразовый снимок состояния после диапазонной загрузки и выбора настроек.
  - `applyDelta(update)` — дельта поверх текущего снапшота (кластер/тики/ladder) с информацией о необходимости merge.
  - `resize(size)` — пересчёт layout/матриц под новый viewport.
  - `draw(reason)` — явный триггер перерисовки после применения снапшота/дельты или резайза, чтобы развести расчёты и отрисовку.

## Роли и взаимодействия
- **Widget (host-компонент).** Получает входные `@Input` (params/presetIndex/minimode/deltamode), управляет жизненным циклом и ресайзом, инициирует orchestrator и предоставляет ему data/realtime/state сервисы.
- **Orchestrator (новый слой).** Подписывается на `FootprintDataLoaderService` и `FootprintRealtimeUpdaterService`, нормализует события (снапшоты, настройки, параметры, realtime), агрегирует их в локальное состояние и выдаёт renderer-команды (`applySnapshot/applyDelta/resize/draw`) в правильном порядке без дублирования пайплайна.
- **Renderer (FootPrintComponent + ViewsManager/MouseAndTouchManager).** Реализует визуализацию: применяет снапшоты/дельты, управляет layout и отрисовкой, реагирует на команды `resize`/`draw`, инкапсулирует графические и интерактивные детали.
- **Data/State services.**
  - `FootprintDataLoaderService` — единая точка загрузки диапазона, настроек и пресетов; держит последний снапшот для мерджа realtime.
  - `FootprintRealtimeUpdaterService` — управляет подпиской на SignalR и доставкой дельт в data loader.
  - `FootprintStateService` — хранит UI-состояние и вспомогательные флаги (selection/hint/deltaVolumes), предоставляя renderer изолированный снимок состояния.
