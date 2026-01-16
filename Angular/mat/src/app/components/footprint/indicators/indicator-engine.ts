import { ChartSettings } from 'src/app/models/ChartSettings';
import { ClusterData } from '../models/cluster-data';
import {
  Candle,
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  PanelRef,
  ParamField,
  ParamSchema,
  SourceType,
} from './indicator-api';
import { IndicatorRegistry } from './indicator-registry';

type IndicatorConfig = NonNullable<ChartSettings['Indicators']>[number];

export interface IndicatorPanelLayout {
  id: string;
  height: number;
}

type EnginePanel = {
  id: string;
  height: number;
};

type Runtime = {
  configId: string;
  def: IndicatorDefinition<any>;
  instance: IndicatorInstance<any>;
  panel: PanelRef;
};

const DEFAULT_PANEL_HEIGHT = 90;

export class FootprintIndicatorEngine {
  private data: ClusterData | null = null;
  private settings: ChartSettings | null = null;

  private candlesCache: Candle[] = [];
  private candlesCacheDataRef: ClusterData | null = null;
  private candlesCacheBarsCount = 0;

  private lastBarsCount = 0;
  private lastLastTime = 0;

  private runtimes = new Map<string, Runtime>();
  private chartSeries: DataSeries[] = [];
  private panelSeries = new Map<string, DataSeries[]>();
  private panels: EnginePanel[] = [];

  private needsFullRecalc = true;

  constructor(
    private registry: IndicatorRegistry,
    private callbacks: {
      requestRender: () => void;
      requestRecalc: () => void;
    },
    private panelsApi: {
      ensurePanel: (kind: 'chart' | 'new', preferredId?: string) => PanelRef;
      getPanelHeight: (panelId: string) => number;
    }
  ) {}

  setData(data: ClusterData | null): void {
    const changed = this.data !== data;
    this.data = data;
    if (changed) {
      this.needsFullRecalc = true;
      this.lastBarsCount = 0;
      this.lastLastTime = 0;
    }
  }

  setSettings(settings: ChartSettings | null): void {
    this.settings = settings;
  }

  requestFullRecalc(): void {
    this.needsFullRecalc = true;
  }

  listDefinitions(): IndicatorDefinition<any>[] {
    return this.registry.list();
  }

  getChartSeries(): DataSeries[] {
    return this.chartSeries;
  }

  getPanelSeries(panelId: string): DataSeries[] {
    return this.panelSeries.get(panelId) ?? [];
  }

  getPanels(): IndicatorPanelLayout[] {
    return this.panels.map((p) => ({ id: p.id, height: p.height }));
  }

  /**
   * Sync instances from settings and (re)calculate as needed.
   * Call once per render cycle before layout is built.
   */
  prepare(): void {
    const data = this.data;
    const settings = this.settings;
    if (!data || !settings) {
      this.disposeAll();
      return;
    }

    this.ensureCandlesCache(data);
    const barsCount = this.candlesCache.length;

    this.syncFromSettings(settings, barsCount);

    const lastTime = this.candlesCache.length ? this.candlesCache[this.candlesCache.length - 1].t : 0;
    const barsChanged = barsCount !== this.lastBarsCount;
    const lastBarLikelyUpdated = !barsChanged && lastTime === this.lastLastTime;

    const calcMode: 'full' | 'append' | 'updateLast' =
      this.needsFullRecalc || this.lastBarsCount === 0
        ? 'full'
        : barsChanged
          ? 'append'
          : lastBarLikelyUpdated
            ? 'updateLast'
            : 'updateLast';

    const fromBar =
      calcMode === 'full'
        ? 0
        : calcMode === 'append'
          ? Math.max(0, this.lastBarsCount)
          : Math.max(0, barsCount - 1);
    const toBar = Math.max(0, barsCount - 1);

    if (barsCount > 0) {
      for (const runtime of this.runtimes.values()) {
        this.ensureSeriesCapacity(runtime.instance, barsCount);

        const warmup = Math.max(0, runtime.instance.warmupPeriod ?? 0);
        const start = calcMode === 'full' ? 0 : Math.max(0, fromBar - warmup);

        for (let bar = start; bar <= toBar; bar++) {
          runtime.instance.onCalculate(bar);
        }
      }
    }

    this.rebuildSeriesIndex();

    this.lastBarsCount = barsCount;
    this.lastLastTime = lastTime;
    this.needsFullRecalc = false;
  }

  private syncFromSettings(settings: ChartSettings, barsCount: number): void {
    const configs = settings.Indicators ?? [];
    const resolvePanel = (
      def: IndicatorDefinition<any>,
      config: IndicatorConfig,
      currentPanel?: PanelRef
    ): PanelRef => {
      const panelBehavior = def.panelBehavior ?? 'configurable';
      const isFixed = panelBehavior === 'fixed';

      if (isFixed) {
        if (def.defaultPanel === 'chart') {
          return 'chart';
        }

        const cfgPanel = config.panel;
        if (cfgPanel && cfgPanel !== 'chart') {
          return cfgPanel;
        }

        if (currentPanel && currentPanel !== 'chart') {
          return currentPanel;
        }

        return this.panelsApi.ensurePanel('new', `${def.type}-${config.id}`);
      }

      if (config.panel) {
        return config.panel;
      }

      if (def.defaultPanel === 'newPanel') {
        return this.panelsApi.ensurePanel('new', `${def.type}-${config.id}`);
      }

      return 'chart';
    };

    const seenIds = new Set<string>();
    for (const config of configs) {
      if (!config?.id || !config?.type) continue;
      seenIds.add(config.id);
      if (this.runtimes.has(config.id)) continue;

      const def = this.registry.get(config.type);
      if (!def) continue;

      const params = this.coerceParams(def.paramsSchema as ParamSchema<any>, config.params ?? {});
      const ctx = this.createContext(barsCount);

      const instance = def.create(ctx, params);
      instance.onInit?.();

      // panel selection: keep configurable indicators flexible, lock fixed indicators to default panel kind
      instance.panel = resolvePanel(def, config);

      instance.series.forEach((s) => {
        if (!s.values || s.values.length !== barsCount) {
          const next = new Float64Array(barsCount);
          next.fill(NaN);
          if (s.values) next.set(s.values.subarray(0, Math.min(s.values.length, next.length)));
          s.values = next;
        }
        if (s.visible === undefined) s.visible = config.visible ?? true;
      });

      this.runtimes.set(config.id, { configId: config.id, def, instance, panel: instance.panel });
      this.needsFullRecalc = true;
    }

    // remove missing
    for (const existingId of [...this.runtimes.keys()]) {
      if (!seenIds.has(existingId)) {
        const rt = this.runtimes.get(existingId);
        rt?.instance.dispose?.();
        this.runtimes.delete(existingId);
        this.needsFullRecalc = true;
      }
    }

    // update params/panel/visibility for existing
    for (const config of configs) {
      const rt = this.runtimes.get(config.id);
      if (!rt) continue;

      const nextPanel = resolvePanel(rt.def, config, rt.instance.panel);
      if (JSON.stringify(nextPanel) !== JSON.stringify(rt.instance.panel)) {
        rt.instance.panel = nextPanel;
        this.needsFullRecalc = true;
      }

      const nextVisible = config.visible ?? true;
      rt.instance.series.forEach((s) => (s.visible = nextVisible));

      const nextParams = this.coerceParams(rt.def.paramsSchema as ParamSchema<any>, config.params ?? {});
      if (JSON.stringify(nextParams) !== JSON.stringify(rt.instance.params)) {
        rt.instance.params = nextParams;
        rt.instance.onParamsChanged?.(nextParams);
        this.needsFullRecalc = true;
      }
    }

    this.rebuildPanels(settings);
  }

  private rebuildPanels(settings: ChartSettings): void {
    const panelIdsInOrder: string[] = [];
    const seen = new Set<string>();
    for (const rt of this.runtimes.values()) {
      const panel = rt.instance.panel;
      if (panel !== 'chart') {
        const id = panel.id;
        if (!seen.has(id)) {
          seen.add(id);
          panelIdsInOrder.push(id);
        }
      }
    }

    this.panels = panelIdsInOrder.map((id) => ({
      id,
      height: this.panelsApi.getPanelHeight(id),
    }));
  }

  private rebuildSeriesIndex(): void {
    const chartSeries: DataSeries[] = [];
    const panelSeries = new Map<string, DataSeries[]>();

    for (const rt of this.runtimes.values()) {
      const panel = rt.instance.panel;
      const series = rt.instance.series.filter((s) => s.visible !== false);
      if (!series.length) continue;

      if (panel === 'chart') {
        chartSeries.push(...series);
        continue;
      }

      const existing = panelSeries.get(panel.id) ?? [];
      existing.push(...series);
      panelSeries.set(panel.id, existing);
    }

    this.chartSeries = chartSeries;
    this.panelSeries = panelSeries;
  }

  private createContext(barsCount: number): IndicatorContext {
    return {
      candles: this.getCandlesSnapshot(),
      source: (bar: number, src: SourceType) => this.sourceAt(bar, src),
      currentBar: () => Math.max(0, this.getCandlesSnapshot().length - 1),
      barsCount: () => this.getCandlesSnapshot().length,
      requestRender: () => this.callbacks.requestRender(),
      requestRecalc: () => {
        this.callbacks.requestRecalc();
        this.needsFullRecalc = true;
      },
      ensurePanel: (kind: 'chart' | 'new', preferredId?: string) =>
        this.panelsApi.ensurePanel(kind, preferredId),
    };
  }

  private getCandlesSnapshot(): Candle[] {
    const data = this.data;
    if (!data) return [];
    this.ensureCandlesCache(data);
    return this.candlesCache;
  }

  private sourceAt(bar: number, src: SourceType): number {
    const data = this.data;
    if (!data) return NaN;
    const c = data.clusterData[bar];
    if (!c) return NaN;

    switch (src) {
      case 'close':
        return c.c;
      case 'open':
        return c.o;
      case 'high':
        return c.h;
      case 'low':
        return c.l;
      case 'hl2':
        return (c.h + c.l) / 2;
      case 'hlc3':
        return (c.h + c.l + c.c) / 3;
      case 'ohlc4':
        return (c.o + c.h + c.l + c.c) / 4;
      case 'volume':
        return c.v ?? 0;
      case 'oi':
        return c.oi ?? 0;
      default:
        return NaN;
    }
  }

  private ensureCandlesCache(data: ClusterData): void {
    if (this.candlesCacheDataRef !== data || this.candlesCacheBarsCount !== data.clusterData.length) {
      this.candlesCacheDataRef = data;
      this.candlesCacheBarsCount = data.clusterData.length;
      this.candlesCache = data.clusterData.map((c) => ({
        t: c.x?.getTime?.() ?? 0,
        o: c.o,
        h: c.h,
        l: c.l,
        c: c.c,
        v: c.v ?? 0,
        oi: c.oi ?? 0,
      }));
    }
  }

  private ensureSeriesCapacity(instance: IndicatorInstance<any>, barsCount: number): void {
    for (const series of instance.series) {
      if (series.values.length === barsCount) continue;
      const next = new Float64Array(barsCount);
      next.fill(NaN);
      next.set(series.values.subarray(0, Math.min(series.values.length, next.length)));
      series.values = next;
    }
  }

  private coerceParams<P extends object>(schema: ParamSchema<P>, params: any): P {
    const out: any = {};
    for (const key of Object.keys(schema) as Array<keyof P>) {
      const field = schema[key] as ParamField<any>;
      const raw = params?.[key as any];
      out[key] = this.coerceValue(field, raw);
    }
    return out as P;
  }

  private coerceValue(field: ParamField<any>, raw: any): any {
    const v = raw ?? field.default;
    switch (field.type) {
      case 'bool':
        return !!v;
      case 'int': {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        if (!isFinite(n)) return field.default;
        const floored = Math.floor(n);
        const min = field.min ?? floored;
        const max = field.max ?? floored;
        return Math.max(min, Math.min(max, floored));
      }
      case 'float': {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        if (!isFinite(n)) return field.default;
        const min = field.min ?? n;
        const max = field.max ?? n;
        return Math.max(min, Math.min(max, n));
      }
      case 'color':
        return String(v);
      case 'enum': {
        const opts = field.options ?? [];
        if (!opts.length) return v;
        const allowed = new Set(opts.map((o) => o.value));
        return allowed.has(v) ? v : field.default;
      }
      default:
        return v;
    }
  }

  private disposeAll(): void {
    for (const rt of this.runtimes.values()) {
      rt.instance.dispose?.();
    }
    this.runtimes.clear();
    this.chartSeries = [];
    this.panelSeries.clear();
    this.panels = [];
    this.candlesCache = [];
    this.candlesCacheDataRef = null;
    this.candlesCacheBarsCount = 0;
    this.lastBarsCount = 0;
    this.lastLastTime = 0;
    this.needsFullRecalc = true;
  }
}
