````md
# Задание для Codex: Сервис цветовых схем для FootPrintComponent (Angular)

## Контекст
В проекте есть `FootPrintComponent`, который отрисовывает график (в т.ч. через canvas / TS-рендер). Сейчас цвета “зашиты” в коде. Нужно вынести цвета в тему (design tokens) и управлять ими через единый сервис.  
В дальнейшем этот сервис должен расширяться и использоваться другими компонентами и частями сайта.

---

## Цели
1. **Вынести цвета из TS-логики в тему** на базе CSS-переменных (CSS custom properties).
2. Создать **Theme/ColorSchemeService**, который:
   - читает значения CSS-переменных и отдаёт готовую палитру в TS,
   - умеет применять пользовательскую тему runtime (через `setProperty`),
   - кэширует результаты и не дергает `getComputedStyle` в render-loop.
3. Реализовать **интеграцию с FootPrintComponent**:
   - FootPrintComponent использует палитру из сервиса,
   - при смене темы инициируется корректная перерисовка.
4. Подготовить архитектуру, чтобы в будущем:
   - подключать темы к другим компонентам,
   - иметь несколько разных тем на одной странице (локально на host-элементе).

---

## Нефункциональные требования
- **Производительность:**  
  Запрещено вызывать `getComputedStyle()` внутри цикла рендера/кадра.  
  Чтение CSS vars допускается только на:
  - init компоненты,
  - смене темы,
  - смене размеров (если влияет на внешний вид) — опционально.
- **Локальность темы:**  
  Тема должна быть **локальной на контейнере компоненты**, а не глобальной на `:root`.
  Это нужно, чтобы можно было иметь **несколько графиков с разными темами** на одной странице.
- **Расширяемость:**  
  Сервис должен быть сделан так, чтобы позже добавлять новые токены и использовать в других компонентах.

---

## Концепция: Design Tokens на CSS variables + ThemeService

### Почему так
- Пользовательские цвета = простая подмена CSS vars.
- Одна “истина” цветов в стилях, TS только читает.
- Можно делать dark/light темы, пресеты и “несколько графиков — несколько тем”.

---

## План работ

### 1) Определить набор токенов темы для FootPrint
Создать семантические токены (не “color1”, а “up/down/grid/text” и т.п.). Минимальный набор:

- `--sc-bg` — фон графика
- `--sc-grid` — сетка / второстепенные линии
- `--sc-text` — основной текст
- `--sc-axis` — оси/подписи шкалы (если нужно отдельно)
- `--sc-up` — рост / покупка / положительная дельта
- `--sc-down` — падение / продажа / отрицательная дельта
- `--sc-bid` — bid-цвет
- `--sc-ask` — ask-цвет
- `--sc-accent` — акцент (выделение)
- `--sc-selection` — выделение диапазона (если есть)
- `--sc-crosshair` — цвет курсора/крестика (если есть)

Дополнительно (если есть heatmap / градиенты):
- `--sc-heat-low`
- `--sc-heat-mid`
- `--sc-heat-high`

> Примечание: для некоторых производных цветов (hover/alpha) допускается вычислять в TS.

---

### 2) Создать CSS-файл темы для FootPrintComponent
Добавить CSS переменные локально на уровне host.

**Файл:** `footprint.theme.css` (или в `footprint.component.scss` в отдельном блоке)  
**Пример:**
```css
:host {
  --sc-bg: #0b0f19;
  --sc-grid: rgba(255,255,255,0.06);
  --sc-text: rgba(255,255,255,0.85);

  --sc-up: #2ecc71;
  --sc-down: #e74c3c;

  --sc-bid: #3b82f6;
  --sc-ask: #f97316;

  --sc-accent: #a855f7;
  --sc-selection: rgba(168,85,247,0.25);
  --sc-crosshair: rgba(255,255,255,0.25);

  --sc-heat-low: rgba(59,130,246,0.10);
  --sc-heat-mid: rgba(168,85,247,0.20);
  --sc-heat-high: rgba(249,115,22,0.30);
}
````

---

### 3) Реализовать Theme/ColorSchemeService (основа для всего сайта)

#### 3.1. Структура сервиса

**Файл:** `src/app/services/theme/color-scheme.service.ts`

Сервис должен:

* Принимать `HTMLElement` как источник темы (`hostEl`),
* Читать CSS vars `getComputedStyle(hostEl)` один раз и кэшировать,
* Возвращать `StockChartPalette` для TS-рендера,
* Уметь применять пользовательские значения: `applyTheme(hostEl, themePartial)`.

#### 3.2. Интерфейсы

**Файл:** `src/app/services/theme/theme.model.ts`

```ts
export type StockChartTheme = Partial<{
  bg: string;
  grid: string;
  text: string;
  axis: string;

  up: string;
  down: string;

  bid: string;
  ask: string;

  accent: string;
  selection: string;
  crosshair: string;

  heatLow: string;
  heatMid: string;
  heatHigh: string;
}>;

export type StockChartPalette = Required<StockChartTheme>;
```

> `StockChartPalette` должен быть *полным*, без `undefined` (для удобства рендера).
> Если CSS var не найден — использовать fallback по умолчанию.

#### 3.3. API сервиса

Обязательные методы:

```ts
export class ColorSchemeService {
  /** Читает CSS vars из hostEl, обновляет кэш и возвращает палитру */
  readPalette(hostEl: HTMLElement): StockChartPalette;

  /** Возвращает закэшированную палитру, если есть, иначе читает заново */
  getPalette(hostEl: HTMLElement): StockChartPalette;

  /** Применяет themePartial как CSS vars на hostEl, обновляет кэш */
  applyTheme(hostEl: HTMLElement, theme: StockChartTheme): StockChartPalette;

  /** Сигнал о смене темы (для подписки компонентами) */
  themeChanged$: Observable<{ hostEl: HTMLElement; palette: StockChartPalette }>;
}
```

Дополнительно (желательно):

* `setPreset(hostEl, presetName)` — подключение заранее определенных тем
* `exportTheme(hostEl)` — вернуть текущее состояние CSS vars как JSON
* `resetTheme(hostEl)` — сброс на дефолт

#### 3.4. Карта соответствия токенов ↔ CSS vars

Создать явную мапу:

```ts
const CSS_VARS = {
  bg: '--sc-bg',
  grid: '--sc-grid',
  text: '--sc-text',
  axis: '--sc-axis',

  up: '--sc-up',
  down: '--sc-down',

  bid: '--sc-bid',
  ask: '--sc-ask',

  accent: '--sc-accent',
  selection: '--sc-selection',
  crosshair: '--sc-crosshair',

  heatLow: '--sc-heat-low',
  heatMid: '--sc-heat-mid',
  heatHigh: '--sc-heat-high',
} as const;
```

---

### 4) Интеграция с FootPrintComponent

#### 4.1. Инициализация темы

В `FootPrintComponent`:

* получить `hostEl` через `ElementRef<HTMLElement>`
* на `ngAfterViewInit` вызвать `colorSchemeService.readPalette(hostEl)`
* сохранить `palette` и использовать в рендере

**Важно:** не ходить за цветами напрямую в `getComputedStyle` внутри рендера.

#### 4.2. Реакция на смену темы

FootPrintComponent подписывается на `themeChanged$`:

* если событие относится к его hostEl → обновить `palette` → `requestRender()` / `redraw()`

#### 4.3. Рендерер должен принимать палитру

Если есть отдельный класс рендера, например `FootPrintRenderer`:

* добавить `setPalette(palette: StockChartPalette)`
* перерисовка использует только `palette.*`

Пример:

```ts
ctx.fillStyle = palette.bg;
ctx.strokeStyle = palette.grid;
```

---

### 5) Пользовательские темы (подготовка)

Реализовать возможность применять тему из JSON:

* UI пока можно не делать,
* но сервис `applyTheme()` должен быть готов.

Пример:

```ts
colorSchemeService.applyTheme(hostEl, {
  up: '#00ff00',
  down: '#ff0000',
  grid: 'rgba(255,255,255,0.04)',
});
```

---

## Поведение при отсутствии токена

Если в CSS нет переменной:

* вернуть fallback (дефолт),
* логирование: опционально (в dev-mode).

---

## Хранение и переопределение темы

1. По умолчанию тема задается CSS переменными на `:host`.
2. Пользовательская тема переопределяет переменные через `hostEl.style.setProperty(...)`.
3. Возможность иметь несколько тем на странице:

* темы живут на уровне конкретного hostEl.

---

## Unit Tests (минимум)

**Файл:** `color-scheme.service.spec.ts`

Тесты:

1. `readPalette()` возвращает palette с fallback-значениями если переменных нет.
2. `applyTheme()` применяет переменные на hostEl и отражается в `getPalette()`.
3. `themeChanged$` эмитит событие при `applyTheme()`.

---

## Acceptance Criteria (готово, если)

* FootPrintComponent не хранит “жестко забитых” цветов в TS (кроме fallback).
* Цвета берутся из `ColorSchemeService` и применяются к canvas-рендеру.
* `getComputedStyle()` не вызывается в render-loop (проверить визуально/логами).
* `applyTheme(hostEl, theme)` меняет цвета графика runtime без перезагрузки.
* Архитектура позволяет позже подключить этот сервис к другим компонентам.

---

## Идеи на расширение (не обязательно в первой итерации)

* Глобальные пресеты: `LightTheme`, `DarkTheme`, `Classic`, `Contrast`.
* Сохранение пользовательской темы в `localStorage` / API.
* Генерация производных цветов (alpha/hover) в TS.
* Общий `ThemeRegistryService` для сайта:

  * хранит текущие темы,
  * переключает theme на уровне layout,
  * наследование токенов (site -> chart -> component).

