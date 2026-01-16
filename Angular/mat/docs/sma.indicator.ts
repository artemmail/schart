// sma.indicator.ts

import {
  IndicatorDefinition,
  IndicatorContext,
  IndicatorInstance,
  DataSeries,
  ParamSchema,
  SourceType
} from "./indicator-api"; // заменить на ваш путь

type SmaParams = {
  source: "close" | "open" | "high" | "low";
  period: number;
  color: string;
  width: number;
};

const smaParamsSchema: ParamSchema<SmaParams> = {
  source: {
    type: "enum",
    title: "Source",
    default: "close",
    options: [
      { value: "close", label: "Close" },
      { value: "open", label: "Open" },
      { value: "high", label: "High" },
      { value: "low", label: "Low" },
    ],
  },
  period: { type: "int", title: "Period", default: 20, min: 1, max: 500, step: 1 },
  color: { type: "color", title: "Color", default: "#f1c40f" },
  width: { type: "int", title: "Width", default: 1, min: 1, max: 5, step: 1 },
};

export const SmaIndicator: IndicatorDefinition<SmaParams> = {
  type: "sma",
  displayName: "SMA",
  category: "Trend",
  defaultPanel: "chart",
  paramsSchema: smaParamsSchema,

  create(ctx: IndicatorContext, params: SmaParams): IndicatorInstance<SmaParams> {
    const series: DataSeries = {
      id: "SMA",
      name: `SMA(${params.period})`,
      visual: "Line",
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: params.width,
      visible: true,
    };

    // инициализируем NaN чтобы линия не “стреляла” в ноль на первых барах
    series.values.fill(NaN);

    const getSrc = (bar: number) => ctx.source(bar, params.source as SourceType);

    // простой расчёт: O(period) на бар (v1)
    const calcBar = (bar: number) => {
      const p = Math.max(1, Math.floor(params.period));

      if (bar < p - 1) {
        series.values[bar] = NaN;
        return;
      }

      let sum = 0;
      for (let i = bar - p + 1; i <= bar; i++) sum += getSrc(i);
      series.values[bar] = sum / p;
    };

    return {
      type: "sma",
      params,
      panel: "chart",
      series: [series],

      onCalculate(bar: number) {
        // защита если данных меньше чем размер массива
        if (bar < 0 || bar >= ctx.barsCount()) return;

        // если баров стало больше (new bar) — нужно расширить серию
        // v1: простой подход — если lengths mismatch, пересоздать массив
        if (series.values.length !== ctx.barsCount()) {
          const next = new Float64Array(ctx.barsCount());
          next.fill(NaN);
          next.set(series.values.subarray(0, Math.min(series.values.length, next.length)));
          series.values = next;
        }

        calcBar(bar);
      },

      onParamsChanged(next: SmaParams) {
        params = next;

        // обновить внешний вид
        series.color = next.color;
        series.width = next.width;
        series.name = `SMA(${next.period})`;

        // полный пересчет (v1)
        ctx.requestRecalc();
      },
    };
  },
};
