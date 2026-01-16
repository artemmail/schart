<!-- 06_FOOTPRINT_INTEGRATION.md -->

# 06. FootPrintComponent: интеграция индикаторов v1

## 1) Откуда берутся свечи (Candles)
В FootPrintComponent индикаторы считаются по `ClusterData.clusterData` (по колонкам/барам).

Маппинг источников:
- `t` берётся из `column.x.getTime()` (Date -> unix ms)
- `open/high/low/close` -> `o/h/l/c`
- `volume` -> `v`

## 2) Где хранится конфигурация (сериализация)
Конфигурация активных индикаторов хранится в `ChartSettings`:
- `ChartSettings.Indicators[]` — список инстансов индикаторов (type + params + panel + visible)
- `ChartSettings.IndicatorPanels{}` — настройки подпанелей (высота/заголовок)

Это даёт совместимость с пресетами (пишется/читается вместе с настройками).

## 3) Рендеринг
Встраивание сделано через существующую архитектуру FootPrint:
- `ViewsManager.drawClusterView()` вызывает `indicatorEngine.prepare()` до расчёта layout.
- Overlay-серии (`panel="chart"`) рисуются в `viewIndicatorsOverlay` поверх основного графика.
- Подпанели (`panel={id}`) добавляются в `FootprintLayoutService.calculateLayout()` как дополнительный “bottom stack” и рисуются в `viewIndicatorPanel`.

Поддержанные visual modes (v1):
- `Line` (overlay и подпанели)
- `Histogram` (подпанели; baseline = bottom/zero)

## 4) Warmup / инкрементальный пересчёт
Для индикаторов введено поле:
- `IndicatorInstance.warmupPeriod?: number`

Engine при обновлении последнего бара/добавлении нового бара пересчитывает диапазон:
`fromBar - warmupPeriod .. lastBar`.

## 5) UI
В `FootPrintSettingsDialogComponent` добавлена вкладка “Индикаторы”:
- Добавление индикатора из реестра
- Редактирование параметров по `paramsSchema`
- Выбор панели (chart / existing / new)

Встроенные индикаторы (v1):
- `SMA` (overlay)
- `Volume` (histogram, отдельная подпанель)

