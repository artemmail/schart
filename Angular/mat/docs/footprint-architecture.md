# Архитектура модуля Footprint

## Роли слоёв
- **Widget (`FootprintWidgetComponent`)** — точка входа для встраивания. Отвечает за получение входных параметров, создание потоков данных/настроек и делегирование визуализации в рендерер. Управляет жизненным циклом (инициализация, resize, очистка) и передаёт post-init хуки в рендерер.
- **Orchestrator (виджет + подписки)** — связывает сервисы загрузки и realtime с рендерером. Настраивает цепочки подписок на `data$`, `settings$`, `params$`, `presets$`, `updates$`, преобразует события SignalR в команды рендерера и инициирует `initializeDataFlow`/`reload`/`configureRealtime` по изменениям входов.
- **DataManager (`FootprintDataLoaderService`)** — подготавливает настройки (пресеты, `ChartSettings`, deltamode/minimode), загружает диапазон кластеров и публикует состояние в виде потоков. Мержит realtime-пакеты (`cluster`/`ticks`/`ladder`) в актуальное состояние и сообщает об этом оркестратору через `FootprintUpdateEvent`.
- **SettingsManager** — логика разрешения пресетов и конкретных настроек живёт в `ChartSettingsService`, а `FootprintDataLoaderService` применяет их к параметрам виджета (в том числе мини-режим и delta). Настройки передаются в рендерер через поток `settings$` и метод `applySettings`.
- **Renderer (`FootPrintComponent`)** — отвечает за холст, менеджеры представлений (`ViewsManager`, `MouseAndTouchManager`, `MarkUpManager`) и состояние (`FootprintStateService`). Обрабатывает команды от оркестратора (`applyParams`, `applySettings`, `applyData`, `handleRealtimeUpdate`, `resize`) и выполняет отрисовку.

## События и команды
- **Потоки данных**: `data$`, `settings$`, `params$`, `presets$` из `FootprintDataLoaderService`; `updates$` из `FootprintRealtimeUpdaterService`. Они подключаются в `connectDataStreams`, где каждое событие превращается в вызов соответствующей команды рендерера (`applyData`, `applySettings`, `applyParams`).
- **Команды оркестратора**: `initializeDataFlow` (первичная загрузка и настройка realtime), `reload`/`serverRequest` (принудительная перезагрузка данных), `configureRealtime` (подписка/переподписка), `triggerResize` (пробрасывает resize в рендерер), `getCsv` (делегирует экспорт).
- **Команды рендерера**: `applyParams` фиксирует параметры в состоянии; `applySettings`/`applyData` проводят матрицу и layout через `initSize` → `resize`; `handleRealtimeUpdate` использует `mergeMatrix` для обновления видимой матрицы перед перерисовкой.
- **События realtime**: `FootprintUpdateEvent` инкапсулирует тип пакета (`cluster`, `ticks`, `ladder`) и флаг merge; оркестратор передаёт их в рендерер через `handleRealtimeUpdate`.

## Последовательность инициализации
1. **`ngAfterViewInit` в виджете**: биндинг realtime к рендереру (`bindRealtime`), подключение потоков (`connectDataStreams`), настройка `ResizeObserver`, запуск `initializeDataFlow` и первичный `resize` через `triggerResize`.
2. **`initializeDataFlow`**: определяет опции (mini/delta), вызывает `FootprintDataLoaderService.initialize` (загрузка пресетов, settings, данных) и после успешной загрузки запускает `configureRealtime` для подписки на SignalR.
3. **`FootPrintComponent.ngAfterViewInit`**: подготавливает canvas и менеджеры ввода/отрисовки, помечает `viewInitialized` и вызывает `initializeViewIfReady`.
4. **`initializeViewIfReady`**: при наличии данных и параметров запускает пайплайн `initSize` → `resize` → `drawClusterView`, чтобы синхронизировать layout с загруженными данными.
5. **Обновления**: `applySettings` и `applyData` повторно запускают пайплайн, `handleRealtimeUpdate` выполняет merge (для `cluster`/`ticks`) и перерисовку без пересоздания layout.

## Схема взаимодействий
- **Основной поток**: `FootprintWidgetComponent` → (initialize & connect) → `FootprintDataLoaderService` / `FootprintRealtimeUpdaterService` → (streams/updates) → `FootPrintComponent` → `ViewsManager`/`MouseAndTouchManager`/`MarkUpManager` (отрисовка на canvas).
- **Настройки**: `FootprintWidgetComponent` → `FootprintDataLoaderService` → `ChartSettingsService` → `FootPrintComponent.applySettings` → `FootprintLayoutService`/`ViewsManager`.
- **Realtime**: SignalR → `FootprintRealtimeUpdaterService` → `FootprintDataLoaderService.applyRealtimeUpdate` → `FootprintWidgetComponent` (через `updates$`) → `FootPrintComponent.handleRealtimeUpdate` → `ViewsManager.drawClusterView`.

## Миграция: добавление новых сигналов/команд
1. **Определить контракт**: расширить `FootprintUpdateType`/`FootprintUpdateEvent` новым типом пакета или сигналом; при добавлении команды описать её входные данные и ожидаемый эффект для рендерера.
2. **Подписка на источник**: зарегистрировать приёмник в `FootprintRealtimeUpdaterService.registerRealtimeHandlers` и пробросить его в `emitUpdate`. Для новых команд без realtime — добавить вызов в `FootprintWidgetComponent` или связанный сервис.
3. **Мерж состояния**: реализовать обработчик в `FootprintDataLoaderService.applyRealtimeUpdate` (или отдельном DataManager-е), чтобы обновить `currentData` и сформировать `FootprintUpdateEvent`.
4. **Передача в рендерер**: подписать `connectDataStreams` на новый поток/событие и вызвать нужный метод рендерера; при необходимости добавить новый метод в `FootPrintComponent` рядом с `applyData`/`applySettings`/`handleRealtimeUpdate`.
5. **Инициализация и тесты**: убедиться, что новый сигнал включён в `initializeDataFlow`/`configureRealtime`, пересмотреть последовательность `initSize`/`resize`, и добавить чек-лист/авто-тесты для проверки новых сценариев (видимость, подписки, merge данных).
