<!-- 01_ARCHITECTURE.md -->

# 01. Архитектура системы индикаторов

## 1) Базовая модель данных
Движок графика оперирует свечами (Candles). Индикаторы читают candle-данные через контекст и пишут результат в серии.

### Candle (минимум)
- t: number (unix ms)
- o/h/l/c: number
- v: number (volume, может быть 0/undefined)

В будущем допускается расширение:
- bidV / askV / delta / trades / oi etc.

---

## 2) Основные подсистемы

### A) IndicatorRegistry
Реестр всех доступных индикаторов.
- register(def)
- get(type)
- list()

Ответственность:
- хранить мета-описание индикаторов,
- фабрика создания инстансов.

---

### B) IndicatorEngine (runtime)
Жизненный цикл и расчет индикаторов на конкретном графике.

Функции:
- addIndicator(type, params, panelPref?)
- removeIndicator(instanceId)
- updateParams(instanceId, params)
- calculateRange(fromBar, toBar)
- onDataUpdated(changeType, range)

Ответственность:
- создавать инстансы
- управлять пересчетом
- управлять инкрементальными обновлениями (например, изменился последний бар)
- предоставлять данные в рендерер

---

### C) PanelManager
Управляет панелями:
- chart panel (главная, цены)
- subpanels (отдельные окна)

Функции:
- ensurePanel(kind="chart"|"new", preferredId?)
- attachIndicatorToPanel(instanceId, panelRef)
- reorderPanels

---

### D) Rendering subsystem
Рисует:
- цену (candles)
- индикаторные серии (линии/гистограммы)
- опциональные кастомные слои (onRender у индикатора)

Рендер основывается на mapping-функциях:
- barIndex -> x
- value -> y (по scale панели)

---

## 3) Принцип "как в ATAS"
Индикатор должен быть:
- чистым по вычислению (не знать о DOM/Angular)
- зависимым только от контекста (данные + сервисы invalidate/recalc)
- управляемым параметрами
- сериализуемым (params + panel + style)

---

## 4) Поток данных
### Сценарии обновления:
1) Initial load (история):
   - engine рассчитывает все индикаторы с 0..N-1

2) Update last bar (тик пришел в текущую свечу):
   - engine пересчитывает только lastBar (и возможный warmup диапазон индикатора)

3) New bar appended:
   - engine расширяет массивы серий
   - рассчитывает только новый бар (и warmup диапазон)

4) Params changed:
   - engine запускает полный пересчет (или частичный если возможно)

---

## 5) Хранение состояния
Для каждого индикатора:
- id (instanceId)
- type
- params
- panelRef
- series styles (color/width/visible)

Сериализация/десериализация обязана быть стабильной по версии v1.

---

## Реализация в этом репозитории (FootPrintComponent)
В текущем коде эти подсистемы отображаются так:
- `IndicatorRegistry` -> `src/app/components/footprint/indicators/indicator-registry.ts`
- `IndicatorEngine` -> `src/app/components/footprint/indicators/indicator-engine.ts` (инкрементальный расчёт + warmup)
- `PanelManager` -> комбинация:
  - `ChartSettings.IndicatorPanels` (хранит высоты/метаданные подпанелей)
  - `FootprintLayoutService.calculateLayout()` (добавляет indicatorPanels в общий layout)
- `Rendering subsystem` -> новые canvas views:
  - overlay: `src/app/components/footprint/views/view-indicators-overlay.ts`
  - subpanels: `src/app/components/footprint/views/view-indicator-panel.ts`

Интеграционный поток:
1) `ViewsManager.drawClusterView()` вызывает `indicatorEngine.prepare()` до `calculateLayout()`.
2) Layout получает `indicatorPanels` и резервирует под них место снизу.
3) `ViewsManager.createParts()` добавляет views для overlay и подпанелей в список `views[]`.
