Если у тебя есть **биржевая IV (VOLAT)** и/или **THEORPRICE**, то греки считаются “обычно” — просто **тем же прайсинг-моделем, под который эта IV определена**.

На срочке Московская биржа теоретические параметры для опционов на фьючерсы считаются по **модели Блэка (Black-76)** (в методиках прямо упоминается Black и “маржируемые европейские опционы на фьючерсы”). ([moex.com][1])
А НКЦ (АО) пишет, что теорцена в ходе торгов считается из **рыночной котировки фьючерса** (как БА) и **текущей кривой волатильности**. ([nationalclearingcentre.ru][2])

Ниже — как это сделать на практике.

---

## 1) Что тебе нужно на вход (для Black-76)

Для каждого опциона:

* **F** — цена фьючерса (лучше mid или “база” как у TSLab: last/mid/и т.п., но главное — *консистентность*)
* **K** — страйк
* **σ** — волатильность (обычно `VOLAT / 100`, если VOLAT в процентах)
* **T** — время до экспирации в годах (важно: daycount/торговое время — выбери и зафиксируй)
* **r** — безрисковая ставка для дисконтирования (для дельты/гаммы влияние небольшое; для совпадения с биржевым THEORPRICE лучше брать ту же кривую/ставку, что в риск-параметрах) ([nationalclearingcentre.ru][2])
* флаг **call/put**

---

## 2) Формулы цены (Black-76) и d1/d2

Дисконт-фактор: `DF = exp(-r*T)`

[
d_1=\frac{\ln(F/K)+\frac{1}{2}\sigma^2 T}{\sigma\sqrt{T}},\quad d_2=d_1-\sigma\sqrt{T}
]

Цена:

* Call: `C = DF * ( F*N(d1) - K*N(d2) )`
* Put:  `P = DF * ( K*N(-d2) - F*N(-d1) )` ([Lme][3])

---

## 3) Греки, которые обычно реально нужны (для хеджа и риска)

В Black-76 “естественная” дельта — **forward-delta**, т.е. производная по **F** (по фьючерсу). Это ровно то, что нужно для хеджа фьючом.

Обозначения: `n(x)` — плотность нормального распределения, `N(x)` — CDF.

### Delta (по фьючерсу)

* Call: `Δ = DF * N(d1)`
* Put:  `Δ = - DF * N(-d1)` ([GlynHolton.com][4])

### Gamma (по фьючерсу)

* `Γ = DF * n(d1) / (F * σ * sqrt(T))` (одинакова для call/put) ([GlynHolton.com][4])

### Vega

* `Vega = DF * F * n(d1) * sqrt(T)`
  Если хочешь “вега на 1 vol point”, дели на 100. ([GlynHolton.com][4])

### Theta / Rho

Их можно брать в закрытой форме (у Glyn Holton они приведены), но на практике в сервисе часто удобнее и надежнее считать **численно** “bump & reprice”:

* `Theta ≈ (Price(T - 1day) - Price(T)) / 1day`
* `Rho ≈ (Price(r + 0.0001) - Price(r)) / 0.0001`
  (где 1 day — это 1/365 или 1/252, как ты выбрал). ([GlynHolton.com][4])

---

## 4) Как гарантировать, что ты считаешь “как биржа” (важно!)

Раз у тебя есть **THEORPRICE** и **VOLAT от биржи**, сделай проверку-калибровку:

1. Берёшь F (какую цену фьюча ты используешь), K, σ=VOLAT/100, T, r.
2. Считаешь цену Black-76.
3. Сравниваешь с THEORPRICE.

Если не сходится:

* почти всегда виноваты **F (какая именно цена фьюча: last vs settlement vs mid)**, **T (daycount/торговое время)** или **r (какая кривая/ставка)**.
  Это норм, потому что биржа/клиринг используют свои конвенции и кривые риск-параметров. ([nationalclearingcentre.ru][2])

---

## 5) Мини-пример кода (C#) для delta/gamma/vega

```csharp
public static class Black76
{
    // Normal CDF/PDF: подставь свою реализацию (MathNet, собственная аппроксимация и т.п.)
    static double N(double x) => NormalCdf(x);
    static double n(double x) => Math.Exp(-0.5 * x * x) / Math.Sqrt(2.0 * Math.PI);

    public static (double price, double delta, double gamma, double vega) PriceAndGreeks(
        bool isCall, double F, double K, double sigma, double r, double T)
    {
        if (T <= 0 || sigma <= 0 || F <= 0 || K <= 0)
        {
            // В простом варианте: цена = intrinsic discounted, греки грубо (или 0).
            double df0 = Math.Exp(-r * Math.Max(T, 0));
            double intrinsic = isCall ? Math.Max(F - K, 0) : Math.Max(K - F, 0);
            return (df0 * intrinsic, 0, 0, 0);
        }

        double sqrtT = Math.Sqrt(T);
        double df = Math.Exp(-r * T);

        double d1 = (Math.Log(F / K) + 0.5 * sigma * sigma * T) / (sigma * sqrtT);
        double d2 = d1 - sigma * sqrtT;

        double Nd1 = N(d1);
        double Nd2 = N(d2);
        double nd1 = n(d1);

        double price = isCall
            ? df * (F * Nd1 - K * Nd2)
            : df * (K * N(-d2) - F * N(-d1));

        // forward delta (по фьючерсу)
        double delta = isCall ? df * Nd1 : -df * N(-d1);

        // forward gamma (одинакова)
        double gamma = df * nd1 / (F * sigma * sqrtT);

        // vega (на 1.0 волы; на 1 vol point дели на 100)
        double vega = df * F * nd1 * sqrtT;

        return (price, delta, gamma, vega);
    }
}
```

---

## 6) Важный нюанс про “биржевую волу”

Биржевая VOLAT часто является частью **кривой/улыбки**, которую клиринг использует для теорцены/рисков. ([nationalclearingcentre.ru][2])
Поэтому:

* для **показа улыбки** — отлично;
* для **риска/дельта-хеджа** — лучше считать греки **не по bid/ask-воле**, а по **сглаженной/клиринговой** (или по твоей fitted-smile). Это ровно то, что TSLab в статьях разделяет по назначению.

---

Если скинешь 1 пример твоей строки (F, K, VOLAT, THEORPRICE, expiry datetime), я скажу, **какая именно конвенция T/r/F у тебя сейчас “не совпадает”**, и как сделать, чтобы твои greeks 1-в-1 совпадали с биржевыми.

[1]: https://www.moex.com/a8488?utm_source=chatgpt.com "Option pricing models — Moscow Exchange"
[2]: https://www.nationalclearingcentre.ru/catalog/030902?utm_source=chatgpt.com "Риск-параметры - НКЦ"
[3]: https://www.lme.com/trading/contract-types/options/black-scholes-76-formula?utm_source=chatgpt.com "Black '76 Option Pricing Formula"
[4]: https://www.glynholton.com/notes/black_1976/?utm_source=chatgpt.com "Black (1976) Option Pricing Formula - GlynHolton.com"
