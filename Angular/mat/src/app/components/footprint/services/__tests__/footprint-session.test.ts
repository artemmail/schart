import { expect, it, describe, jest } from '@jest/globals';
import { Subject, of, Observable } from 'rxjs';

jest.mock('@angular/core', () => ({ Injectable: () => (target: unknown) => target }));
jest.mock('@angular/common/http', () => ({ HttpErrorResponse: class extends Error {} }));
jest.mock('src/app/service/chart-settings.service', () => ({
  ChartSettingsService: { miniSettings: () => ({ CandlesOnly: false }) },
}), { virtual: true });
jest.mock('src/app/models/footprint-mode', () =>
  jest.requireActual('../../../../models/footprint-mode'), { virtual: true });

import { FootprintDataLoaderService } from '../footprint-data-loader.service';
import { FootprintRealtimeUpdaterService } from '../footprint-realtime-updater.service';
import { FootprintSessionService } from '../footprint-session.service';
import { ClusterData } from '../../models/cluster-data';

const params = (ticker = 'A') => ({ ticker, period: 1, priceStep: 1, candlesOnly: false });
const options = { minimode: false, deltamode: false };
const bar = (minute = 0, q = 10, c = 100) => ({ Number: minute + 1,
  x: new Date(Date.UTC(2026, 8, 28, 10, minute)), o: c, c, h: c, l: c,
  q, bq: 0, v: q * c, bv: 0, oi: 0, cl: [] });
const data = (...bars: any[]) => new ClusterData({ priceScale: 1, clusterData: bars });
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const ranges: Record<string, Subject<ClusterData>[]> = {};
  const clusters: Record<string, Subject<any>> = {};
  const ticks: Record<string, Subject<any>> = {};
  const ladders: Record<string, Subject<any>> = {};
  const stream = { GetRange: jest.fn((p: any) => {
    const source = new Subject<ClusterData>();
    (ranges[p.ticker] ??= []).push(source);
    return source;
  }) };
  const settings = { getChartSettings: jest.fn((_index: number) => of({ CandlesOnly: false })) };
  const marks = { load: jest.fn(async () => undefined), invalidateLoad: jest.fn() };
  const utilities = { loadPresets: jest.fn(async () => [] as any[]) };
  let handle = 0;
  const hub = {
    connectionRestored$: new Subject<void>(),
    Subscribe: jest.fn(async (_p: any): Promise<string | null> => `handle-${++handle}`),
    unsubscr: jest.fn(async (_key: string) => undefined),
    receiveClusterFor: (p: any) => (clusters[p.ticker] ??= new Subject<any>()),
    receiveTicksFor: (p: any) => (ticks[p.ticker] ??= new Subject<any>()),
    receiveLadderFor: (ticker: string) => (ladders[ticker] ??= new Subject<any>()),
  };
  const loader = new FootprintDataLoaderService(settings as any, marks as any, stream as any, utilities as any);
  const realtime = new FootprintRealtimeUpdaterService(hub as any, loader);
  // Orchestration tests are independent of the market's current opening hours.
  jest.spyOn(realtime as any, 'shouldSubscribe').mockReturnValue(true);
  const session = new FootprintSessionService(loader, realtime);
  const states: any[] = [];
  session.state$.subscribe(value => states.push(value));
  return { loader, realtime, session, ranges, clusters, ticks, ladders, settings, marks, utilities, hub, states };
}
async function ready(f: ReturnType<typeof fixture>, ticker = 'A', bars = [bar()]) {
  const loading = f.session.reload(params(ticker), undefined, options);
  await flush();
  f.ranges[ticker].at(-1)!.next(data(...bars));
  expect(await loading).toBe(true);
}

describe('Footprint versioned session', () => {
  it('resnapshots at window opening before subscribing and cancels the clock on destroy', async () => {
    jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-28T03:44:30Z'));
    const f = fixture();
    try {
      (f.realtime as any).shouldSubscribe.mockRestore();
      (f.realtime as any).isVisible = true;
      await ready(f);
      expect(f.hub.Subscribe).not.toHaveBeenCalled();
      jest.advanceTimersByTime(30_000); await flush();
      expect(f.hub.Subscribe).toHaveBeenCalledTimes(1);
      expect(f.ranges.A).toHaveLength(2);
      f.ranges.A[1].next(data(bar())); await flush();
      expect(f.loader.snapshot?.sessionId).toBe(2);
      f.session.destroy(); expect(jest.getTimerCount()).toBe(0);
    } finally { f.session.destroy(); jest.useRealTimers(); }
  });

  it('does not start a scheduled subscription for a superseded session', async () => {
    jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-28T03:44:30Z'));
    const f = fixture();
    try {
      (f.realtime as any).shouldSubscribe.mockRestore(); (f.realtime as any).isVisible = true;
      await ready(f); f.session.clear();
      jest.advanceTimersByTime(60_000); await flush();
      expect(f.hub.Subscribe).not.toHaveBeenCalled(); expect(f.ranges.A).toHaveLength(1);
    } finally { f.session.destroy(); jest.useRealTimers(); }
  });

  it('notifies settings edits separately without resetting the chart snapshot', async () => {
    const f = fixture(); await ready(f);
    const edits: any[] = []; const sub = f.session.settingsChanges$.subscribe(value => edits.push(value));
    const count = f.states.length;
    f.session.captureSettings({ ...f.loader.snapshot!.settings, DeltaGraph: true });
    expect(edits).toHaveLength(1); expect(edits[0].sessionId).toBe(f.session.currentSessionId);
    expect(f.states.length).toBe(count);
    edits[0].settings.DeltaGraph = false; expect(f.loader.snapshot!.settings.DeltaGraph).toBe(true);
    sub.unsubscribe(); f.session.destroy();
  });
  it('cancels A and publishes only B when HTTP responses arrive in reverse order', async () => {
    const f = fixture();
    const first = f.session.reload(params('A'), 1, options);
    await flush();
    const sourceA = f.ranges.A[0];
    expect(sourceA.observed).toBe(true);
    const second = f.session.reload(params('B'), 2, { ...options, deltamode: true });
    expect(sourceA.observed).toBe(false);
    await flush();
    f.ranges.B[0].next(data(bar(0, 20, 200)));
    expect(await second).toBe(true);
    sourceA.next(data(bar()));
    expect(await first).toBe(false);
    expect(f.loader.snapshot?.params.ticker).toBe('B');
    expect(f.loader.snapshot?.presetIndex).toBe(2);
    expect(f.states.filter(state => state.snapshot).map(state => state.snapshot.params.ticker)).toEqual(['B']);
    expect(f.hub.unsubscr).toHaveBeenCalledWith('handle-1');
    f.session.destroy();
  });

  it('ignores stale preset completion and captures mutable request inputs', async () => {
    const f = fixture();
    const presetsA = deferred<any[]>();
    f.utilities.loadPresets.mockImplementationOnce(() => presetsA.promise);
    const a = f.session.initialize(params('A'), undefined, options);
    const date = new Date('2026-09-28T00:00:00Z');
    const input = { ...params('B'), startDate: date };
    const capturedOptions = { minimode: true, deltamode: true };
    const b = f.session.reload(input, 7, capturedOptions);
    input.ticker = 'C'; date.setFullYear(2000); capturedOptions.deltamode = false;
    await flush();
    f.ranges.B[0].next(data(bar()));
    expect(await b).toBe(true);
    presetsA.resolve([{ Value: 99, Text: 'stale' }]);
    expect(await a).toBe(false);
    expect(f.ranges.A).toBeUndefined();
    expect(f.loader.snapshot?.params.startDate).toEqual(new Date('2026-09-28T00:00:00Z'));
    expect(f.loader.snapshot?.settings.DeltaGraph).toBe(true);
    expect(f.loader.snapshot?.options.deltamode).toBe(true);
    f.session.destroy();
  });

  it('cancels stale settings before starting marks or history', async () => {
    const f = fixture();
    const oldSettings = new Subject<any>();
    f.settings.getChartSettings.mockReturnValueOnce(oldSettings);
    const a = f.session.reload(params('A'), 1, options);
    await flush();
    const b = f.session.reload(params('B'), 2, options);
    expect(oldSettings.observed).toBe(false);
    await flush();
    oldSettings.next({ CandlesOnly: true });
    f.ranges.B[0].next(data(bar()));
    expect(await b).toBe(true); expect(await a).toBe(false);
    expect(f.ranges.A).toBeUndefined();
    expect(f.marks.load).toHaveBeenCalledTimes(1);
    f.session.destroy();
  });

  it('buffers events before subscription ACK and commits history and buffer atomically', async () => {
    const f = fixture();
    const ack = deferred<string>();
    f.hub.Subscribe.mockReturnValueOnce(ack.promise);
    const loading = f.session.reload(params(), undefined, options);
    await flush();
    expect(f.ranges.A).toBeUndefined();
    const event = [bar(1, 15, 105)];
    f.clusters.A.next(event);
    event[0].c = 999;
    expect(f.loader.snapshot).toBeNull();
    ack.resolve('early'); await flush();
    f.clusters.A.next([bar(0, 8, 98)]);
    f.ranges.A[0].next(data(bar(0, 10, 100), bar(2, 20, 110)));
    expect(await loading).toBe(true);
    expect(f.loader.snapshot?.data.clusterData.map(b => b.c)).toEqual([100, 105, 110]);
    expect(f.states.filter(s => s.snapshot)).toHaveLength(1);
    expect(f.states.at(-1).snapshot.data.clusterLength()).toBe(3);
    f.session.destroy();
  });

  it('releases a subscription ACK that arrives after session replacement', async () => {
    const f = fixture(); const ack = deferred<string>();
    f.hub.Subscribe.mockReturnValueOnce(ack.promise);
    const a = f.session.reload(params('A'), undefined, options); await flush();
    const b = f.session.reload(params('B'), undefined, options);
    f.clusters.A.next([bar()]); ack.resolve('late-A'); await flush();
    expect(f.hub.unsubscr).toHaveBeenCalledWith('late-A');
    expect(f.ranges.A).toBeUndefined();
    f.ranges.B[0].next(data(bar()));
    expect(await b).toBe(true); expect(await a).toBe(false);
    f.clusters.A.next([bar(1)]);
    expect(f.loader.snapshot?.data.clusterLength()).toBe(1);
    f.session.destroy();
  });

  it.each(['presets', 'settings', 'marks', 'history'])('shows %s errors and allows retry', async stage => {
    const f = fixture(); const error = new Error(`${stage} failed`);
    if (stage === 'presets') f.utilities.loadPresets.mockRejectedValueOnce(error);
    if (stage === 'settings') f.settings.getChartSettings.mockReturnValueOnce(new Observable(s => s.error(error)));
    if (stage === 'marks') f.marks.load.mockRejectedValueOnce(error);
    const failed = f.session.initialize(params(), 1, options); await flush();
    if (stage === 'history') f.ranges.A[0].error(error);
    expect(await failed).toBe(false);
    expect(f.loader.state.status).toBe('error');
    expect((f.loader.state as any).message).toBe(`${stage} failed`);
    expect(f.loader.snapshot).toBeNull();
    await ready(f);
    expect(f.loader.state.status).toBe('ready');
    f.session.destroy();
  });

  it('reconnect resnapshots the current session and ignores old recovery after selection changes', async () => {
    const f = fixture(); await ready(f);
    const oldId = f.loader.state.sessionId;
    f.hub.connectionRestored$.next(); await flush();
    expect(f.ranges.A).toHaveLength(2);
    const b = f.session.reload(params('B'), undefined, options); await flush();
    expect(await f.session.recover(oldId)).toBe(false);
    f.ranges.A[1].next(data(bar(0, 99)));
    f.ranges.B[0].next(data(bar(0, 20, 200)));
    expect(await b).toBe(true);
    expect(f.loader.snapshot?.params.ticker).toBe('B');
    f.session.destroy();
  });

  it('resnapshots when reconnection happened while history was loading', async () => {
    const f = fixture(); const first = f.session.reload(params(), undefined, options); await flush();
    f.hub.connectionRestored$.next();
    f.ranges.A[0].next(data(bar())); await first; await flush();
    expect(f.ranges.A).toHaveLength(2);
    f.ranges.A[1].next(data(bar(0, 25))); await flush();
    expect(f.loader.snapshot?.data.clusterData[0].q).toBe(25);
    f.session.destroy();
  });

  it('resnapshots after a hidden widget releases its realtime subscription', async () => {
    jest.useFakeTimers();
    try {
      const f = fixture(); await ready(f);
      await (f.realtime as any).handleComponentHidden();
      jest.advanceTimersByTime(10000); await flush();
      expect(f.hub.unsubscr).toHaveBeenCalledWith('handle-1');
      await (f.realtime as any).handleComponentVisible(); await flush();
      expect(f.ranges.A).toHaveLength(2);
      f.ranges.A[1].next(data(bar())); await flush(); f.session.destroy();
    } finally { jest.useRealTimers(); }
  });

  it('rejects overflow instead of silently losing buffered events', async () => {
    const f = fixture(); const loading = f.session.reload(params(), undefined, options); await flush();
    for (let i = 0; i < 2001; i++) f.clusters.A.next([bar()]);
    f.ranges.A[0].next(data(bar()));
    expect(await loading).toBe(false);
    expect(f.loader.state.status).toBe('error');
    expect(f.hub.unsubscr).toHaveBeenCalledWith('handle-1');
    f.session.destroy();
  });

  it('preserves renderer settings edits during recovery without another snapshot draw', async () => {
    const f = fixture(); await ready(f);
    f.session.updateSettings(f.loader.snapshot!.settings, 5);
    const publications = f.states.length;
    f.session.captureSettings({ ...f.loader.snapshot!.settings, DeltaGraph: true });
    expect(f.states.length).toBe(publications);
    expect(f.states.at(-1).snapshot.settings.DeltaGraph).toBe(true);
    f.hub.connectionRestored$.next(); await flush();
    f.ranges.A[1].next(data(bar())); await flush();
    expect(f.loader.snapshot?.settings.DeltaGraph).toBe(true);
    expect(f.loader.snapshot?.presetIndex).toBe(5);
    f.session.destroy();
  });

  it('rejects failed realtime acquisition before requesting history', async () => {
    const f = fixture();
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      f.hub.Subscribe.mockResolvedValueOnce(null);
      expect(await f.session.reload(params(), undefined, options)).toBe(false);
      expect(f.loader.state.status).toBe('error');
      expect(f.ranges.A).toBeUndefined();
      expect(f.clusters.A.observed).toBe(false);
      await ready(f);
      f.session.destroy();
    } finally { log.mockRestore(); }
  });

  it('refuses queued visibility work and canvas rebinding after destroy', async () => {
    jest.useFakeTimers();
    try {
      const f = fixture();
      f.session.destroy();
      f.realtime.bindCanvas({ nativeElement: {} } as any);
      await (f.realtime as any).handleComponentHidden();
      await (f.realtime as any).handleComponentVisible();
      expect(jest.getTimerCount()).toBe(0);
      expect(f.hub.Subscribe).not.toHaveBeenCalled();
      expect(f.ranges.A).toBeUndefined();
    } finally { jest.useRealTimers(); }
  });

  it.each(['HTTP', 'subscription'])('destroy during %s prevents all late commits and releases handles', async stage => {
    const f = fixture(); const ack = deferred<string>();
    if (stage === 'subscription') f.hub.Subscribe.mockReturnValueOnce(ack.promise);
    const loading = f.session.reload(params(), undefined, options); await flush();
    f.session.destroy();
    if (stage === 'subscription') ack.resolve('late');
    else f.ranges.A[0].next(data(bar()));
    expect(await loading).toBe(false); await flush();
    expect(f.loader.snapshot).toBeNull();
    expect(f.states.filter(state => state.snapshot)).toHaveLength(0);
    expect(f.hub.unsubscr).toHaveBeenCalledWith(stage === 'subscription' ? 'late' : 'handle-1');
    expect(await f.session.reload(params(), undefined, options)).toBe(false);
  });
});
