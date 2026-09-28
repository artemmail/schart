import { TopOrdersComponentFP } from '../../FootPrintParts/top-orders/top-orders.component';
import { VolumeSearchTableComponent } from '../../FootPrintParts/volume-search-table/volume-search-table.component';
import { FootprintCsvTableComponent } from '../../FootPrintParts/csv-table/footprint-csv-table.component';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FootprintControllerService } from './footprint-controller.service';
import { FootprintDataLoaderService } from './footprint-data-loader.service';
import { FootprintRealtimeUpdaterService } from './footprint-realtime-updater.service';
import { FootprintSessionService } from './footprint-session.service';
import { OpenPositionsRepository } from './open-positions.repository';
import { ClusterData } from '../models/cluster-data';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { FootPrintSettingsDialogComponent } from '../components/footprint-settings-dialog/footprint-settings-dialog.component';
import { viewVolumes } from '../views/view-volumes';
import { RenderContext, InteractionContext } from '../models/footprint-context';
import { Matrix } from '../models/matrix';
import { Line } from '../markup/line';
import { MarkUpManager } from '../markup/markup-manager';

const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const params = (ticker = 'A') => ({ ticker, period: 1, priceStep: 1, candlesOnly: false });
const options = { minimode: false, deltamode: false };
const chartData = () => new ClusterData({ priceScale: 1, clusterData: [{
  Number: 1, x: new Date('2026-09-28T10:00:00Z'), o: 100, h: 102, l: 99, c: 101,
  q: 100, bq: 40, v: 10000, bv: 4000, oi: 0, cl: [],
}] });
function fixture() {
  const settingsRequests = new Map<number, Subject<any>>();
  const settings = {
    getChartSettings: jasmine.createSpy('getChartSettings').and.callFake((index: number) => settingsRequests.get(index) ?? of(ChartSettingsService.DefaultSettings())),
    saveChartSettings: jasmine.createSpy('saveChartSettings').and.returnValue(of({})),
    updateSettings: jasmine.createSpy('updateSettings').and.returnValue(of(1)),
    deleteSettings: jasmine.createSpy('deleteSettings').and.returnValue(of({})),
    getPresets: jasmine.createSpy('getPresets').and.returnValue(of([{ Value: 1, Text: 'Default' }])),
  };
  const history = { GetRange: jasmine.createSpy('GetRange').and.callFake(() => of(chartData())) };
  const marks = { load: async () => undefined, invalidateLoad: () => undefined, getFilters: () => ({ volume1: 0, volume2: 0 }) };
  const loader = new FootprintDataLoaderService(settings as any, marks as any, history as any,
    { loadPresets: async () => [{ Value: 1, Text: 'Default' }] } as any);
  const hub = { connectionRestored$: new Subject<void>(), Subscribe: async () => 'handle', unsubscr: async () => undefined,
    receiveClusterFor: () => new Subject(), receiveTicksFor: () => new Subject(), receiveLadderFor: () => new Subject() };
  const realtime = new FootprintRealtimeUpdaterService(hub as any, loader);
  spyOn(realtime as any, 'shouldSubscribe').and.returnValue(false);
  const session = new FootprintSessionService(loader, realtime);
  const controller = new FootprintControllerService(session, settings as any, marks as any, {} as any);
  const presentation = jasmine.createSpy('updatePresentation');
  controller.bindRenderer({ updatePresentation: presentation } as any);
  const ready = () => controller.initialize(params(), 1, options);
  const destroy = () => { controller.destroy(); session.destroy(); };
  return { controller, loader, session, history, settings, settingsRequests, presentation, ready, destroy };
}

describe('Footprint public commands', () => {
  it('cancels an older preset and publishes only the current preset and history', async () => {
    const f = fixture();
    try {
      await f.ready();
      const a = new Subject<any>(); const b = new Subject<any>();
      f.settingsRequests.set(2, a); f.settingsRequests.set(3, b);
      const first = f.controller.selectPreset(2); await flush(); expect(a.observed).toBe(true);
      const second = f.controller.selectPreset(3); await flush(); expect(a.observed).toBe(false);
      b.next(ChartSettingsService.DefaultSettings()); expect(await second).toBe(true);
      a.next(ChartSettingsService.DefaultSettings()); expect(await first).toBe(false);
      expect(f.controller.presetIndex).toBe(3);
      expect(f.settings.saveChartSettings).toHaveBeenCalledOnceWith(3);
      expect(f.history.GetRange).toHaveBeenCalledTimes(2);
    } finally { f.destroy(); }
  });

  for (const kind of ['save', 'delete', 'metadata']) {
    it(`ignores a ${kind} response after a new session`, async () => {
      const f = fixture();
      try {
        await f.ready(); const pending = new Subject<any>();
        if (kind === 'save') f.settings.updateSettings.and.returnValue(pending);
        if (kind === 'delete') f.settings.deleteSettings.and.returnValue(pending);
        if (kind === 'metadata') f.settings.getPresets.and.returnValue(pending);
        const task = kind === 'save' ? f.controller.saveSettings() : kind === 'delete' ? f.controller.deletePreset() : f.controller.refreshPresets();
        await flush(); expect(pending.observed).toBe(true);
        await f.controller.reload(params('B'), 1); expect(pending.observed).toBe(false);
        pending.next(kind === 'metadata' ? [{ Value: 99, Text: 'stale' }] : 99);
        expect(await task).toBe(false); expect(f.controller.params.ticker).toBe('B');
        expect(f.controller.presetIndex).toBe(1); expect(f.controller.commandError).toBeNull();
        expect(f.history.GetRange).toHaveBeenCalledTimes(2);
      } finally { f.destroy(); }
    });
  }

  it('orders quick saves and captures each draft before the next edit', async () => {
    const f = fixture();
    try {
      await f.ready(); const first = new Subject<number>(); const second = new Subject<number>();
      f.settings.updateSettings.and.returnValues(first, second);
      const draft = structuredClone(f.controller.settings); draft.Name = 'First';
      const a = f.controller.saveSettings(draft); draft.Name = 'Second';
      const b = f.controller.saveSettings(draft); draft.Name = 'Unsaved';
      await flush(); expect(f.settings.updateSettings).toHaveBeenCalledTimes(1);
      expect(f.settings.updateSettings.calls.argsFor(0)[0].Name).toBe('First');
      first.next(1); expect(await a).toBe(true); await flush();
      expect(f.settings.updateSettings.calls.argsFor(1)[0].Name).toBe('Second');
      second.next(1); expect(await b).toBe(true); expect(f.controller.settings.Name).toBe('Second');
    } finally { f.destroy(); }
  });

  it('updates presentation and preset metadata without replacing history or session', async () => {
    const f = fixture();
    try {
      await f.ready(); const before = f.session.snapshot;
      const draft = structuredClone(f.controller.settings); draft.Name = 'Changed';
      f.controller.applySettings(draft); await f.controller.refreshPresets();
      expect(f.session.snapshot.data).toBe(before.data); expect(f.session.currentSessionId).toBe(before.sessionId);
      expect(f.presentation).toHaveBeenCalledWith(before.settings);
      expect(f.history.GetRange).toHaveBeenCalledTimes(1);
      expect(f.controller.settings.Name).toBe('Changed');
    } finally { f.destroy(); }
  });

  it('preserves a newly saved window position when an older settings draft is saved', async () => {
    const f = fixture();
    try {
      await f.ready(); const draft = structuredClone(f.controller.settings);
      expect(await f.controller.saveDialogPosition('settings', { x: 15, y: 25 })).toBe(true);
      draft.Name = 'Older draft'; expect(await f.controller.saveSettings(draft)).toBe(true);
      expect(f.controller.settings.DialogPositions.settings).toEqual({ x: 15, y: 25 });
      expect(f.settings.updateSettings.calls.mostRecent().args[0].DialogPositions.settings).toEqual({ x: 15, y: 25 });
    } finally { f.destroy(); }
  });

  it('applies markup drafts through a command and refreshes them after manager changes', async () => {
    const f = fixture();
    try {
      const original = { width: 1, color: '#123' }; const onParamsChanged = jasmine.createSpy('onParamsChanged');
      f.controller.bindRenderer({ markupManager: { getToolParams: () => original, onParamsChanged } } as any);
      const draft = f.controller.getMarkupParams('Line'); draft.width = 3;
      expect(original.width).toBe(1);
      f.controller.changeMarkupParams(draft, 'tool', 'Line'); expect(original.width).toBe(3);
      expect(onParamsChanged).toHaveBeenCalledOnceWith(false);
      original.width = 5; expect(f.controller.getMarkupParams('Line').width).toBe(5);
    } finally { f.destroy(); }
  });

  it('reports a command error and cancels commands and queued writes on destroy', async () => {
    const f = fixture();
    await f.ready(); f.settings.updateSettings.and.returnValue(throwError(() => new Error('save failed')));
    expect(await f.controller.saveSettings()).toBe(false); expect(f.controller.commandError).toBe('save failed');
    const pending = new Subject<number>(); f.settings.updateSettings.and.returnValue(pending);
    const first = f.controller.saveSettings(); const queued = f.controller.saveSettings(); await flush();
    f.destroy(); expect(pending.observed).toBe(false);
    expect(await first).toBe(false); expect(await queued).toBe(false);
    expect(f.settings.updateSettings).toHaveBeenCalledTimes(2);
  });

  it('keeps dialog drafts separate and refreshes them for a new session', async () => {
    const f = fixture(); const dialog = new FootPrintSettingsDialogComponent();
    try {
      await f.ready(); dialog.fp = f.controller; dialog.ngOnChanges();
      const original = f.controller.settings.Name; dialog.settings.Name = 'Draft';
      expect(f.controller.settings.Name).toBe(original);
      await f.controller.reload(params('B'), 1); expect(dialog.settings.Name).toBe(f.controller.settings.Name);
      dialog.ngOnDestroy(); const detached = dialog.settings;
      await f.controller.reload(params('C'), 1); expect(dialog.settings).toBe(detached);
    } finally { dialog.ngOnDestroy(); f.destroy(); }
  });
});

describe('OpenPositionsRepository', () => {
  function repositoryFixture() {
    const future = { getFutInfo: jasmine.createSpy('getFutInfo').and.returnValue(of({ assetCode: 'SI' })) };
    const source = new Subject<any[]>();
    const data = { getAllContracts: jasmine.createSpy('getAllContracts').and.returnValue(of(['Si'])),
      getOpenPositionsByContract: jasmine.createSpy('getOpenPositionsByContract').and.returnValue(source) };
    return { repo: new OpenPositionsRepository(data as any, future as any), future, data, source };
  }
  it('deduplicates normalized tickers and normalizes and sorts position rows', async () => {
    const f = repositoryFixture();
    try {
      const a = f.repo.load(' si '); const b = f.repo.load('SI'); await flush();
      expect(f.future.getFutInfo).toHaveBeenCalledOnceWith('SI');
      expect(f.data.getOpenPositionsByContract).toHaveBeenCalledOnceWith('Si');
      f.source.next([{ Date: '2026-09-28', JuridicalLong: '12' }, { Date: 'invalid' }, { Date: '2026-09-27' }]);
      const result = await a; expect(await b).toEqual(result);
      expect(result.status).toBe('ok'); expect(result.positions.length).toBe(2);
      expect(result.positions[1].juridicalLong).toBe(12);
      await f.repo.load('SI'); expect(f.future.getFutInfo).toHaveBeenCalledTimes(1);
    } finally { f.repo.dispose(); }
  });
  it('allows retry after an error and preserves forbidden and non-future statuses', async () => {
    const f = repositoryFixture();
    try {
      f.future.getFutInfo.and.returnValue(throwError(() => new Error('temporary')));
      expect((await f.repo.load('SI')).status).toBe('error');
      f.future.getFutInfo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'subscription' } })));
      expect(await f.repo.load('SI')).toEqual({ status: 'forbidden', message: 'subscription' });
      f.future.getFutInfo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      expect((await f.repo.load('OTHER')).status).toBe('notFuture');
      expect(f.future.getFutInfo).toHaveBeenCalledTimes(3);
    } finally { f.repo.dispose(); }
  });
  it('keeps two repository owners independent', async () => {
    const a = repositoryFixture(); const b = repositoryFixture();
    const taskA = a.repo.load('SI'); const taskB = b.repo.load('SI'); await flush();
    a.repo.dispose(); expect(a.source.observed).toBe(false); expect(b.source.observed).toBe(true);
    b.source.next([{ Date: '2026-09-28' }]); expect((await taskA).status).toBe('error');
    expect((await taskB).status).toBe('ok'); b.repo.dispose();
  });
});

describe('Footprint views without an Angular component', () => {
  it('draws volumes from a plain render context and reads replacement data', () => {
    const painted: number[] = [];
    const context: RenderContext = {
      data: chartData(), ctx: { setMatrix: () => undefined, mFillRectangle: (_x, _y, _w, h) => painted.push(h) } as any,
      palette: { upSoft: '#fff', downSoft: '#000' } as any, colorsService: {} as any, formatService: {} as any,
      FPsettings: { ...ChartSettingsService.DefaultSettings(), Contracts: true, classic: 'ASK+BID', VolumeInCandleColor: false },
      params: params(), minimode: false, minIndex: 0, maxIndex: 0, selectedColumn: null, hiddenHint: false, pointer: null,
      getBar: () => ({ x: 0, y: 0, w: 10, h: 10 }), clusterRect: () => ({ x: 0, y: 0, w: 10, h: 10 }),
      clusterRectFontSize: () => 10, topVolumes: () => true,
    };
    const view = { x: 0, y: 0, w: 200, h: 100 }; const matrix = new Matrix();
    const volumes = new viewVolumes(context, view, matrix); volumes.draw(context, view, matrix);
    expect(painted).toEqual([40, 60]);
    const next = chartData(); next.clusterData[0].q = 120; next.clusterData[0].bq = 30;
    const replaced = { ...context, data: next }; volumes.parent = replaced; painted.length = 0;
    volumes.draw(replaced, view, matrix); expect(painted).toEqual([30, 90]); volumes.dispose();
  });
  it('draws and edits a Line using only the interaction context', () => {
    const lineTo = jasmine.createSpy('lineTo'); const moveTo = jasmine.createSpy('moveTo');
    const context: InteractionContext = { data: null,
      ctx: { beginPath: () => undefined, moveTo, lineTo, stroke: () => undefined } as any,
      palette: {} as any, colorsService: { sscale: () => 1 },
      viewport: { view: { x: 0, y: 0, w: 200, h: 100 }, mtx: new Matrix() },
      clusterRect2: () => ({ x: 0, y: 0, w: 1, h: 1 }), requestRender: () => undefined, setCursor: () => undefined };
    const line = new Line({ footprint: context, defaultSelectionColor: '#fff' } as unknown as MarkUpManager, { width: 2, color: '#123' });
    line.onStartDraw({ x: 10, y: 20 }); line.onMouseDownMove({ x: 30, y: 40 }); line.drawShape();
    expect(moveTo).toHaveBeenCalledWith(10, 20); expect(lineTo).toHaveBeenCalledWith(30, 40);
    expect(line.selectedPoint({ x: 10, y: 20 }).shape).toBe(line);
    line.movePoints({ x: 0, y: 0 }, { x: 5, y: 5 }); expect(line.pointArray[0]).toEqual({ x: 15, y: 25 });
  });
});



describe('Footprint tables with a stable controller', () => {
  for (const kind of ['orders', 'volume']) {
    it(`refreshes ${kind}, skips metadata-only changes and cancels the previous HTTP`, async () => {
      const f = fixture(); const responses: Subject<any[]>[] = [];
      const request = jasmine.createSpy('report').and.callFake(() => {
        const source = new Subject<any[]>(); responses.push(source); return source;
      });
      const table = kind === 'orders' ? new TopOrdersComponentFP({ getTopOrdersPeriod: request } as any)
        : new VolumeSearchTableComponent({ volumeSearch: request } as any);
      try {
        await f.ready(); table.NP = f.controller; table.ngOnChanges({ NP: {} } as any);
        expect(responses[0].observed).toBe(true);
        await f.controller.refreshPresets(); expect(request).toHaveBeenCalledTimes(1);
        await f.controller.reload(params('B'), 1);
        expect(responses[0].observed).toBe(false); expect(responses[1].observed).toBe(true);
        const current = [{ Price: 200 }] as any; responses[1].next(current);
        responses[0].next([{ Price: 100 }]); expect(table.dataSource.data).toBe(current);
        table.ngOnDestroy(); expect(responses[1].observed).toBe(false);
      } finally { table.ngOnDestroy(); f.destroy(); }
    });
  }
  it('shows CSV rows when realtime fills an initially empty session', async () => {
    const f = fixture(); const table = new FootprintCsvTableComponent();
    try {
      f.history.GetRange.and.returnValue(of(new ClusterData({ priceScale: 1, clusterData: [] })));
      await f.ready(); table.NP = f.controller; table.ngOnChanges({ NP: {} } as any);
      expect(table.hasData).toBe(false);
      f.loader.applyRealtimeUpdate(f.session.currentSessionId, 'cluster', chartData().clusterData);
      expect(table.hasData).toBe(true); expect(table.totalItems).toBe(1);
    } finally { table.ngOnDestroy(); f.destroy(); }
  });
  it('updates CSV rows for a new session and clears them while loading', async () => {
    const f = fixture(); const table = new FootprintCsvTableComponent();
    try {
      await f.ready(); table.NP = f.controller; table.ngOnChanges({ NP: {} } as any);
      expect(table.pageRows[0]).toBe(f.controller.data.clusterData[0]);
      const pending = new Subject<any>(); f.settingsRequests.set(2, pending);
      const task = f.controller.reload(params('B'), 2); await flush();
      expect(table.pageRows).toEqual([]); expect(table.totalItems).toBe(0);
      pending.next(ChartSettingsService.DefaultSettings()); await task;
      expect(table.pageRows[0]).toBe(f.controller.data.clusterData[0]);
    } finally { table.ngOnDestroy(); f.destroy(); }
  });
});
