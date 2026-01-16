<!-- 00_README.md -->

# StockChart Indicators v1 - ТЗ для реализации (TypeScript)

## Цель
Реализовать систему индикаторов в StockChart по архитектурным принципам ATAS:

- Индикатор — независимый модуль вычисления значений по барам.
- Индикатор отдает набор **серий** (DataSeries), которые рендерятся движком.
- Индикатор может рендериться:
  - поверх цены (overlay, panel="chart"),
  - в отдельной панели (panel="new panel" / panelRef),
  - либо дополняться кастомной отрисовкой.
- Параметры индикатора описываются схемой и автоматически отображаются в UI.
- Поддерживается:
  - исторический расчет,
  - инкрементальный расчет на новых барах,
  - пересчет по изменению параметров.

## Вне объема (v1)
- Маркет-профиль/TPO
- Кластерные визуализации, теплокарты
- Полноценный скриптовый язык
- Оптимизация на WebGL (в будущем)

## Минимальные deliverables (v1)
1) Базовые классы/интерфейсы системы индикаторов.
2) PanelManager с созданием отдельной панели.
3) Рендерер серий для:
   - Line
   - Histogram
4) Индикатор Volume (в отдельной панели) - в спецификации, реализация обязательна.
5) Первый простой индикатор SMA (на цене) - реализация обязательна.

---

## Статус в этом репозитории (FootPrintComponent)
Реализация v1 сделана не в “общем StockChart”, а внутри существующего `FootPrintComponent` (canvas + ViewsManager):
- Реестр/движок: `src/app/components/footprint/indicators/indicator-registry.ts`, `src/app/components/footprint/indicators/indicator-engine.ts`
- Built-in индикаторы: `src/app/components/footprint/indicators/builtins/sma.indicator.ts`, `src/app/components/footprint/indicators/builtins/volume.indicator.ts`
- Рендер серий: `src/app/components/footprint/views/view-indicators-overlay.ts`, `src/app/components/footprint/views/view-indicator-panel.ts`
- UI: вкладка “Индикаторы” в `src/app/components/footprint/components/footprint-settings-dialog/footprint-settings-dialog.component.html`
- Сериализация в пресеты: `ChartSettings.Indicators` и `ChartSettings.IndicatorPanels` (см. `src/app/models/ChartSettings.ts`)

Подробности интеграции: `docs/06_FOOTPRINT_INTEGRATION.md`.

## Acceptance Criteria
- Можно зарегистрировать индикатор, добавить на график, увидеть отрисовку.
- Volume рисуется в отдельной панели (histogram).
- SMA рисуется поверх цены (line).
- При изменении параметров SMA/Volume выполняется пересчет и перерисовка.
- При поступлении нового бара/обновления последнего бара индикаторы пересчитывают только необходимый диапазон.

---

## Что уже готово (v1)
- API индикаторов (`IndicatorDefinition/Instance`, `ParamSchema`, `DataSeries` + `HistogramBaseline/WidthRatio`).
- Engine: создание/удаление/обновление по `ChartSettings.Indicators`, инкрементальный пересчёт с `warmupPeriod`.
- Панели: подпанели индикаторов добавляются в layout как дополнительный “bottom stack” (не ломая текущие блоки футпринта).
- UI: добавление/удаление, редактирование params по схеме, выбор панели.
- Тесты движка: `src/app/components/footprint/indicators/__tests__/indicator-engine.test.ts`

## Ограничения текущей версии
- Overlay рисуется только `Line` (histogram поверх цены пока не включён).
- Нет отображения значений индикаторов в тултипе/кроссхейре.
- Нет оптимизации вычислений (SMA O(period) на бар) — достаточно для v1.
- Набор источников ограничен OHLC + volume (без bid/ask/delta/oi как источников).

## План продолжения (v1 -> v2)
1) Расширить источники (`delta`, `oi`, `bid/ask volume`) из `ClusterData` + нормализовать Candle-модель под них.
2) Добавить “Data Window”/tooltip значения индикаторов (по текущему бару/по курсору).
3) Добавить управление подпанелями: высота, порядок, скрытие/удаление, сохранение в пресет.
4) Добавить ещё visual modes (Points, Area, Bands, Labels) и overlay histogram при необходимости.
5) “Пользовательские индикаторы как ATAS”:
   - вариант A: TS-плагины (сборка/загрузка)
   - вариант B: формульный DSL (безопасный sandbox, быстрый цикл)
   - вариант C: скриптовый язык (отдельный этап)
