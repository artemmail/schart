
Ниже список **приоритетный**: сначала “ожидаемая классика”, потом полезные уровни/сессии.

---

# Overlay индикаторы для StockChart — описания для реализации

## 2) EMA — Exponential Moving Average

**Что делает:** экспоненциальная средняя, более “быстрая”, чем SMA.

**Расчёт:**
`EMA[i] = EMA[i-1] + alpha*(src[i]-EMA[i-1])`
`alpha = 2/(length+1)`
Первое значение можно инициализировать SMA на первом окне.

**Параметры:**

* `Length` (int, 1..500, default 10)
* `Source` (enum, default close)
* `Offset` (int, -500..500, default 0)
* `Line width`
* `Line style`
* `Color`

---

## 3) WMA — Weighted Moving Average (по желанию)

**Что делает:** средняя с линейными весами (последние бары важнее).

**Расчёт:** веса `1..length` на окно.

**Параметры:**

* `Length` (int, default 10)
* `Source`
* `Offset`
* `Line width / style / color`

---

## 4) SMMA / RMA — Smoothed Moving Average (как в RSI)

**Что делает:** сглаженная средняя (ещё более плавная, чем EMA).

**Расчёт (RMA):**
`RMA[i] = (RMA[i-1]*(length-1) + src[i]) / length`

**Параметры:**

* `Length` (int, default 10)
* `Source`
* `Offset`
* `Line style`

---

## 5) VWAP — Volume Weighted Average Price (Session VWAP)

**Что делает:** VWAP внутри торговой сессии/дня — якорная “справедливая цена”.
Рисуется линией, часто используют как динамическую поддержку/сопротивление.

**Расчёт:**
`VWAP = sum(price*volume)/sum(volume)` внутри “сброса” (reset point).
Обычно `price = typical price = (H+L+C)/3`.

**Параметры:**

* `Anchor/Reset` (enum):

  * `Session` (каждая сессия)
  * `Day` (каждый календарный день)
  * `Week`
  * `Month`
* `Price source` (enum: hlc3 default, close)
* `Show bands` (bool, default false)
* `Band mode` (enum: StDev / Percent)
* `Band value`:

  * если StDev: `StdDev Multiplier` (float, default 1.0)
  * если Percent: `Percent` (float, default 1.0)
* `Line width / color`
* `Bands fill opacity` (если включено)

*(Если Bands делать не хочешь сейчас — оставь только базовый VWAP + Anchor.)*

---

## 6) Donchian Channels

**Что делает:** канал максимума/минимума за период (пробойный индикатор).
Upper = максимум High, Lower = минимум Low за N баров, Middle = середина.

**Расчёт:**
`Upper[i] = max(high[i-length+1..i])`
`Lower[i] = min(low[i-length+1..i])`
`Middle = (Upper+Lower)/2`

**Параметры:**

* `Length` (int, default 10)
* `Show middle` (bool, default true)
* `Line width`
* `Fill opacity` (между upper/lower)

---

## 7) Keltner Channels (ATR Channel)

**Что делает:** канал волатильности на базе ATR, часто как альтернатива Боллинджеру.

**Расчёт (классика):**

* Basis = EMA(src, length)
* ATR(lengthATR) (обычно тот же length)
* Upper = Basis + Mult * ATR
* Lower = Basis - Mult * ATR

**Параметры:**

* `MA Length` (int, default 10)
* `ATR Length` (int, default 10)
* `MA Source` (enum, default close)
* `ATR Multiplier` (float, default 2.0)
* `MA Type` (enum: EMA/SMA; default EMA)
* `Fill opacity`
* `Line width`

---

## 8) SuperTrend

**Что делает:** трендовый “стоп-линия” индикатор: показывает текущий тренд (up/down) + линию.
Часто используется как трейлинг-стоп.

**Расчёт (классика):**

* `ATR` на период length
* Middle = (High+Low)/2
* BasicUpper = Middle + Mult*ATR
* BasicLower = Middle - Mult*ATR
* Далее “финальные” линии с логикой переключения тренда (стандартная SuperTrend).

**Параметры:**

* `ATR Length` (int, default 10)
* `Multiplier` (float, default 3.0)
* `Source` (обычно hl2 фиксированно, или enum если надо)
* `Show trend coloring` (bool, default true) — окраска линии/свечей
* `Up color`
* `Down color`
* `Line width`

---

## 9) Parabolic SAR

**Что делает:** точки SAR над/под ценой, динамический стоп и сигнал разворота.

**Параметры:**

* `Step` (float, default 0.02)
* `Max Step` (float, default 0.2)
* `Dot size` (int)
* `Color`
* `Highlight reversals` (bool) — маркер смены стороны

---

## 10) Pivot Points (Daily/Weekly/Monthly)

**Что делает:** рисует уровни pivot (P, R1..R3, S1..S3).
Полезно для уровней “дня”.

**Параметры:**

* `Pivot timeframe` (enum: Daily/Weekly/Monthly)
* `Method` (enum: Classic/Fibonacci/Camarilla/Woodie)
* `Levels` (enum: 1..3) — сколько рисовать R/S
* `Show labels` (bool)
* `Extend lines` (enum: Current period / To right / Full chart)
* `Line style / width`
* `Colors for P/R/S` (можно одним цветом или отдельно)

---

## 11) Previous Day Levels (PDH/PDL/POC optional)

**Что делает:** уровни прошлого торгового дня:

* `Prev High`
* `Prev Low`
* `Prev Close`
* `Today Open`

*(POC сюда лучше не мешать — это уже профиль.)*

**Параметры:**

* `Show Prev High` (bool)
* `Show Prev Low` (bool)
* `Show Prev Close` (bool)
* `Show Today Open` (bool)
* `Extend` (enum: only today / full right)
* `Line style/width`
* `Labels` (bool)

---

## 12) Session Open Range (Opening Range)

**Что делает:** отмечает диапазон первых N минут/баров сессии:

* High/Low opening range
* опционально mid

**Параметры:**

* `Session definition` (enum: Exchange session / Custom time)
* `OR duration` (enum: 5m/15m/30m/60m или int bars)
* `Extend` (bool: extend to end of session)
* `Show mid` (bool)
* `Fill opacity`
* `Line style/width`

---

## 13) Fractals (Bill Williams)

**Что делает:** рисует маркеры фракталов:

* up-fractal: максимум выше соседей слева/справа
* down-fractal: минимум ниже соседей слева/справа

**Параметры:**

* `Left bars` (int default 2)
* `Right bars` (int default 2)
* `Marker style` (triangle/arrow/dot)
* `Up color`
* `Down color`

---

## 14) ZigZag (опционально, но люди любят)

**Что делает:** упрощает движение цены линией через экстремумы (для структуры тренда).

**Параметры (лучше один режим выбрать):**

* `Deviation %` (float, default 5.0) **или**
* `Deviation points` (float)
* `Depth` (int) — минимум баров между экстремумами
* `Backstep` (int)
* `Line width / color`
* `Show pivot labels` (bool)

---

# Рекомендуемый порядок реализации (самый разумный)

1. **EMA** (быстро + must-have)
2. **VWAP (session/day anchor)**
3. **Keltner Channels**
4. **SuperTrend**
5. **Pivot Points**
6. **Prev Day Levels**
7. **Donchian**
8. **Parabolic SAR**
9. **Fractals**
10. *(опционально)* ZigZag / WMA / RMA

