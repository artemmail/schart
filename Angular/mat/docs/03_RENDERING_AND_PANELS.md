
---

```md
<!-- 03_RENDERING_AND_PANELS.md -->

# 03. Панели и рендеринг

## 1) Что такое панель
Panel — область отображения с собственной шкалой Y.

Типы:
- chart panel: отображение цены
- subpanel: отдельное окно ниже (объемы, RSI и т.п.)

---

## 2) PanelManager - правила
### Ensure panel
- ensurePanel("chart") всегда возвращает "chart"
- ensurePanel("new", preferredId?) возвращает существующую панель с id либо создаёт новую

### Индикатор в панель
Каждый индикатор имеет panelRef:
- "chart" или { id }

---

## 3) Масштабирование (Scale) панели
Каждая панель должна уметь:
- по набору серий вычислить min/max (видимый диапазон)
- построить функцию value -> yPx

Минимум v1:
- автоматическое масштабирование по видимому диапазону баров
- фиксированные отступы (padding)
- защита от min==max (дать +-1% или фиксированный epsilon)

---

## 4) Рендер серий
### Line
- соединять точки (barIndex -> x, value -> y)

### Histogram
- вертикальные столбики от baseline
- baseline:
  - для Volume: от нижней границы панели вверх
  - для осцилляторов: baseline = 0 (в v2)

Для v1:
- Volume histogram: baseline = bottom.

---

## 5) Рендер-пайплайн (слои)
Рекомендуемый порядок:
1) background
2) grid / axes
3) price candles (chart panel only)
4) series overlays (chart panel)
5) subpanels series
6) crosshair/labels

---

## 6) Re-render triggers
Рендер должен выполняться при:
- расчет завершен
- изменились параметры индикатора
- изменился range видимости (scroll/zoom)
- обновились свечи (тик/новый бар)
- добавлен/удален индикатор

---

## 7) Минимальный контракт рендера (для Engine)
Engine предоставляет renderer-у набор объектов:
- panels: список панелей (chart + subpanels)
- в каждой панели:
  - series[] (data + style)
  - scale (min/max)
  - layoutRect (x,y,w,h)

Renderer сам вызывает отрисовку по visual mode.

---

## Реализация в FootPrintComponent (v1)
В `FootPrintComponent` нет отдельного “рендерера индикаторов” как в абстрактной схеме — индикаторы встроены в существующую систему `views[]`:
- overlay-серии (`panel="chart"`) рисуются отдельным view поверх основного графика
- subpanel-серии (`panel={id}`) рисуются отдельным view в прямоугольнике, который выдаёт layout

Список поддержанных режимов:
- `Line`: overlay и подпанели
- `Histogram`: подпанели (baseline = bottom/zero)
