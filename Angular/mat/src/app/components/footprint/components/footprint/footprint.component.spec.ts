import { ElementRef } from '@angular/core';
import { Subject, of } from 'rxjs';
import { FootPrintComponent } from './footprint.component';
import { OpenPositionsRepository } from '../../services/open-positions.repository';
import { FootprintStateService } from '../../services/footprint-state.service';
import { FootprintLayoutService } from '../../services/footprint-layout.service';
import { HintContainerService } from '../../services/hint-container.service';
import { ClusterData } from '../../models/cluster-data';
import { FootprintSnapshot } from '../../models/footprint-data.types';
import { canvasPart } from '../../views/canvas-part';
import { Matrix } from '../../models/matrix';
import { viewMain } from '../../views/view-main';
import { viewRangeSet } from '../../views/view-range-set';
import { viewAnim } from '../../views/view-anim';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FormattingService } from 'src/app/service/FootPrint/Formatting/formatting.service';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';

function rendererFixture(realPainters = false, barCount = 20) {
  const pending = new Map<number, FrameRequestCallback>(); let sequence = 0;
  spyOn(window, 'requestAnimationFrame').and.callFake(callback => { pending.set(++sequence, callback); return sequence; });
  spyOn(window, 'cancelAnimationFrame').and.callFake(id => { pending.delete(id); });
  const host = document.createElement('div'); host.style.width = '600px'; host.style.height = '400px';
  const canvas = document.createElement('canvas'); host.appendChild(canvas); document.body.appendChild(host);
  const themeChanged$ = new Subject<any>();
  const settings = ChartSettingsService.DefaultSettings();
  const colors = new ColorsService();
  const futInfo = new Subject<any>();
  const contracts = new Subject<string[]>();
  const positions = new Subject<any[]>();
  const common = { getFutInfo: jasmine.createSpy('getFutInfo').and.returnValue(futInfo) };
  const dataService = {
    getAllContracts: jasmine.createSpy('getAllContracts').and.returnValue(contracts),
    getOpenPositionsByContract: jasmine.createSpy('getOpenPositionsByContract').and.returnValue(positions),
  };
  const save = jasmine.createSpy('save').and.returnValue(of({}));
  const dialogResult = new Subject<any>();
  const dialog = { openLevelSettings: jasmine.createSpy('openLevelSettings').and.returnValue(dialogResult) };
  const hint = new HintContainerService();
  const repository = new OpenPositionsRepository(dataService as any, common as any);
  const renderer = new FootPrintComponent(colors, new FormattingService(),
    { readPalette: () => renderer.palette, setPreset: () => renderer.palette, themeChanged$ } as any,
    { applyPreset: () => undefined, getStoredPreset: () => 'Light' } as any,
    new ElementRef(host), {} as any, new LevelMarksService({ post: () => of({}) } as any), dialog as any, {} as any,
    new FootprintLayoutService(colors),
    repository, new FootprintStateService(), hint);
  renderer.settingsSaveRequested.subscribe(save);
  renderer.canvasRef = new ElementRef(canvas);
  renderer.ngAfterViewInit();
  // Exercise real layout/parts ownership; avoid testing every painter here.
  if (!realPainters) spyOn(canvasPart.prototype, 'drawCanvas');
  const paint = spyOn(renderer.viewsManager, 'renderNow').and.callThrough();
  const prepare = spyOn(renderer.indicatorEngine, 'prepare').and.callThrough();
  const data = new ClusterData({ priceScale: 1, clusterData: Array.from({ length: barCount }, (_, index) => ({
    Number: index + 1, x: new Date(Date.UTC(2026, 8, 28, 10, index)), o: 100, h: 102, l: 99, c: 101,
    q: 100, bq: 50, v: 10000, bv: 5000, oi: 0, cl: [{ p: 100, q: 100, bq: 50, ct: 5, mx: 10 }],
  })) });
  const snapshot: FootprintSnapshot = {
    sessionId: 1, params: { ticker: 'A', period: 1, priceStep: 1, candlesOnly: true },
    presetIndex: 1, options: { minimode: false, deltamode: false }, settings: { ...settings, CandlesOnly: true },
    presets: [], data,
  };
  const tick = (time = 16) => {
    const callbacks = Array.from(pending.values()); pending.clear();
    callbacks.forEach(callback => callback(time));
  };
  const cleanup = () => { renderer.dispose(); host.remove(); };
  return { renderer, snapshot, pending, tick, cleanup, paint, prepare, canvas, hint, save,
    themeChanged$, futInfo, contracts, positions, common, dataService, repository, dialog, dialogResult };
}

const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

describe('Footprint renderer resources and frames', () => {
  it('dispatches the complete pinch gesture at DPR 2 without mutating Hammer input', () => {
    const f = rendererFixture();
    try {
      f.renderer.applySnapshot(f.snapshot); f.tick();
      spyOn(f.canvas, 'getBoundingClientRect').and.returnValue({ left: 10, top: 20, width: 300, height: 200 } as DOMRect);
      f.canvas.width = 600; f.canvas.height = 400;
      const view = f.renderer.viewsManager.clusterView;
      const anchor = { x: view.x + view.w / 2, y: view.y + view.h / 2 };
      const center = { x: 10 + anchor.x / 2, y: 20 + anchor.y / 2 };
      const event = { center: { ...center }, scale: 1.5, angle: 0, deltaX: 0, deltaY: 0, velocityX: 0, velocityY: 0 } as any;
      f.renderer.mouseAndTouchManager.onPinchStart(event);
      expect(f.renderer.translateMatrix!.applyToPoint(anchor.x + 1, anchor.y).x).toBeCloseTo(anchor.x + 1.5, 6);
      expect(event.center).toEqual(center);
      f.renderer.mouseAndTouchManager.onPinchEnd(event);
      expect(f.renderer.translateMatrix).toBeNull();
      expect(Number.isFinite(f.renderer.viewsManager.mtx.applyToPoint(0, 0).x)).toBe(true);
    } finally { f.cleanup(); }
  });
  it('refreshes open-position series on expiry and ignores resources after dispose', async () => {
    jasmine.clock().install(); jasmine.clock().mockDate(new Date('2026-09-28T10:00:00Z'));
    const f = rendererFixture();
    try {
      f.snapshot.settings.Indicators = [{ id: 'op', type: 'open-positions-interest', params: {}, panel: 'chart', visible: true }];
      f.renderer.applySnapshot(f.snapshot); f.tick();
      f.futInfo.next({ assetCode: 'SI' }); await flush(); f.contracts.next(['Si']); await flush();
      f.positions.next([{ Date: '2026-09-28', JuridicalLong: 1 }]); await flush(); f.tick();
      const series = () => {
        const engine = f.renderer.indicatorEngine;
        return [...engine.getChartSeries(), ...engine.getPanels().flatMap(panel => engine.getPanelSeries(panel.id))]
          .find(value => value.id.includes('OPI_JL'))!;
      };
      expect(series().values[0]).toBe(1);
      jasmine.clock().tick(60_000); await flush();
      f.futInfo.next({ assetCode: 'SI' }); await flush(); f.contracts.next(['Si']); await flush();
      f.positions.next([{ Date: '2026-09-28', JuridicalLong: 2 }]); await flush(); f.tick();
      expect(series().values[0]).toBe(2);
      expect(f.dataService.getOpenPositionsByContract).toHaveBeenCalledTimes(2);
      f.renderer.dispose(); jasmine.clock().tick(60_000); await flush();
      expect(f.dataService.getOpenPositionsByContract).toHaveBeenCalledTimes(2); expect(f.pending.size).toBe(0);
    } finally { f.cleanup(); jasmine.clock().uninstall(); }
  });
  it('maps pointer coordinates using actual backing-store dimensions including zero coordinates', () => {
    const f = rendererFixture();
    try {
      spyOn(f.canvas, 'getBoundingClientRect').and.returnValue({ left: 10, top: 20, width: 100, height: 80 } as DOMRect);
      f.canvas.width = 125; f.canvas.height = 100;
      expect(f.renderer.mouseAndTouchManager.eventToPoint({ x: 10, y: 20 })).toEqual({ x: 0, y: 0 });
      expect(f.renderer.mouseAndTouchManager.eventToPoint({ center: { x: 110, y: 100 } } as any)).toEqual({ x: 125, y: 100 });
      f.canvas.width = 200; f.canvas.height = 160;
      expect(f.renderer.mouseAndTouchManager.eventToPoint(new MouseEvent('mousemove', { clientX: 60, clientY: 60 }))).toEqual({ x: 100, y: 80 });
    } finally { f.cleanup(); }
  });
  it('coalesces initialization, resize, realtime, theme and indicators and preserves active view owners', () => {
    const f = rendererFixture();
    try {
      f.renderer.applySnapshot(f.snapshot);
      f.renderer.resize(); f.renderer.drawClusterView();
      (f.renderer as any).scheduleIndicatorRender(true);
      f.renderer.handleRealtimeUpdate({ sessionId: 1, type: 'cluster', merged: true });
      f.themeChanged$.next({ hostEl: (f.renderer as any).hostRef.nativeElement, palette: f.renderer.palette });
      expect(f.pending.size).toBe(1); f.tick();
      expect(f.paint).toHaveBeenCalledTimes(1); expect(f.prepare).toHaveBeenCalledTimes(1);
      expect(f.pending.size).toBe(0);
      const main = f.renderer.viewsManager.viewMain;
      const anim = f.renderer.viewsManager.viewAnim;
      f.renderer.resize(); f.renderer.drawClusterView(); f.tick();
      expect(f.paint).toHaveBeenCalledTimes(2); expect(f.prepare).toHaveBeenCalledTimes(2);
      expect(f.renderer.viewsManager.viewMain).toBe(main);
      expect(f.renderer.viewsManager.viewAnim).toBe(anim);
      expect(main?.isDisposed).toBe(false);
    } finally { f.cleanup(); }
  });

  it('emits settings-save commands and preserves viewport for presentation changes', () => {
    const f = rendererFixture();
    try {
      f.renderer.applySnapshot(f.snapshot); f.tick();
      f.renderer.viewsManager.mtx = f.renderer.alignMatrix(
        new Matrix().scale(2, 2).multiply(f.renderer.viewsManager.mtx).getTranslate(-30, 12));
      f.renderer.drawClusterView(); f.tick();
      const matrix = f.renderer.viewsManager.mtxMain;
      f.renderer.updatePresentation({ ...f.snapshot.settings, Name: 'Presentation' });
      f.renderer.saveSettings(); expect(f.save).toHaveBeenCalledOnceWith(f.renderer.FPsettings);
      f.tick(); expect(f.renderer.viewsManager.mtxMain.applyToPoint(2, 100)).toEqual(matrix.applyToPoint(2, 100));
      f.renderer.dispose(); f.renderer.saveSettings(); expect(f.save).toHaveBeenCalledTimes(1);
    } finally { f.cleanup(); }
  });

  it('destroy during drag removes canvas/window listeners and Hammer without persisting settings', () => {
    const f = rendererFixture();
    try {
      f.renderer.applySnapshot(f.snapshot); f.tick();
      const input: any = f.renderer.mouseAndTouchManager;
      const listeners = [...input.listeners];
      const removedCanvas = spyOn(f.canvas, 'removeEventListener').and.callThrough();
      const removedWindow = spyOn(window, 'removeEventListener').and.callThrough();
      const hammerDestroy = spyOn(input.hammer, 'destroy').and.callThrough();
      input.startGlobalMouse(); f.renderer.dragMode = 0;
      f.renderer.updateDeltaVolume(0, 50);
      const move = spyOn(input, 'onMouseMovePressed').and.callThrough();
      const count = f.paint.calls.count();
      f.renderer.dispose(); f.renderer.dispose();
      expect(hammerDestroy).toHaveBeenCalledTimes(1);
      for (const { type, listener } of listeners) expect(removedCanvas).toHaveBeenCalledWith(type, listener);
      expect(removedWindow).toHaveBeenCalledWith('mousemove', input.onWindowMouseMove);
      expect(removedWindow).toHaveBeenCalledWith('mouseup', input.onWindowMouseUp);
      window.dispatchEvent(new MouseEvent('mousemove', { buttons: 1 }));
      window.dispatchEvent(new MouseEvent('mouseup'));
      f.canvas.dispatchEvent(new MouseEvent('mousemove', { buttons: 1 }));
      listeners.find(entry => entry.type === 'mousemove').listener(new MouseEvent('mousemove', { buttons: 1 }));
      expect(move).not.toHaveBeenCalled(); expect(f.save).not.toHaveBeenCalled();
      f.renderer.drawClusterView(); f.renderer.resize(); f.renderer.applySnapshot(f.snapshot); f.tick();
      expect(f.paint.calls.count()).toBe(count); expect(f.pending.size).toBe(0);
      expect(f.renderer.data).toBeNull(); expect(f.renderer.canvas).toBeNull();
    } finally { f.cleanup(); }
  });

  it('session clear cancels swipe/button/reset animations and closes old view subscriptions', () => {
    const f = rendererFixture();
    try {
      f.renderer.applySnapshot(f.snapshot); f.tick();
      const main = f.renderer.viewsManager.viewMain!;
      const anim = f.renderer.viewsManager.viewAnim!;
      main.onSwipe({ velocityX: 2 } as any);
      anim.onMouseEnter(); anim.onTap({ x: 0, y: 0 });
      const prices: any = f.renderer.viewsManager.viewPrices;
      const date = f.renderer.viewsManager.viewDates!;
      spyOn(prices, 'getPrice').and.returnValue(100);
      spyOn(f.renderer.levelMarksService, 'getPriceMark').and.returnValue({ color: '#fff', comment: 'old' } as any);
      prices.onRightClick({ x: 0, y: 0 });
      expect(f.dialogResult.observed).toBe(true);
      const count = f.paint.calls.count();
      const late = Array.from(f.pending.values())[0];
      f.renderer.clearSession();
      expect(main.isDisposed).toBe(true); expect(anim.isDisposed).toBe(true); expect(date.isDisposed).toBe(true);
      expect(f.dialogResult.observed).toBe(false);
      expect(f.pending.size).toBe(0); late(16);
      expect(f.paint.calls.count()).toBe(count);
      expect(f.renderer.translateMatrix).toBeNull();
      f.renderer.applySnapshot({ ...f.snapshot, sessionId: 2 }); f.tick();
      expect(f.paint.calls.count()).toBe(count + 1);
      expect(f.renderer.viewsManager.viewMain).not.toBe(main);
    } finally { f.cleanup(); }
  });

  it('disposing each animated view cancels only its own work', () => {
    const f = rendererFixture();
    try {
      f.renderer.applySnapshot(f.snapshot); f.tick();
      const range = new viewRangeSet(f.renderer.viewContext, f.renderer.viewsManager.clusterView, new Matrix());
      const main = f.renderer.viewsManager.viewMain!;
      const anim = f.renderer.viewsManager.viewAnim!;
      range.onSwipe({ velocityX: 2 } as any); main.onSwipe({ velocityX: 2 } as any); anim.onMouseEnter();
      range.dispose(); main.dispose(); anim.dispose();
      expect(f.pending.size).toBe(0);
      range.onSwipe({ velocityX: 2 } as any); main.onSwipe({ velocityX: 2 } as any); anim.onMouseEnter();
      expect(f.pending.size).toBe(0);
    } finally { f.cleanup(); }
  });

  it('keeps swipe and button animations alive across paints using one shared frame', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-09-28T10:00:00Z'));
    const f = rendererFixture();
    try {
      f.renderer.applySnapshot(f.snapshot); f.tick();
      const main = f.renderer.viewsManager.viewMain!;
      const anim = f.renderer.viewsManager.viewAnim!;
      main.onSwipe({ velocityX: 2 } as any); anim.onMouseEnter();
      const count = f.paint.calls.count();
      jasmine.clock().tick(16); f.tick();
      expect(f.paint.calls.count()).toBe(count + 1); expect(f.pending.size).toBe(1);
      expect(f.renderer.viewsManager.viewMain).toBe(main);
      expect(f.renderer.viewsManager.viewAnim).toBe(anim);
      expect(f.renderer.translateMatrix).not.toBeNull();
      const hover = f.renderer.animButtonState.hoverT;
      jasmine.clock().tick(16); f.tick();
      expect(f.paint.calls.count()).toBe(count + 2);
      expect(f.renderer.animButtonState.hoverT).toBeGreaterThan(hover);
      f.renderer.clearSession(); expect(f.pending.size).toBe(0);
    } finally { f.cleanup(); jasmine.clock().uninstall(); }
  });

});

for (const stage of ['future', 'contracts', 'positions']) {
  describe(`Footprint destroy during ${stage} request`, () => {
    it('cancels HTTP and prevents later requests and cache restoration', async () => {
      const f = rendererFixture();
      try {
        const request = f.repository.load('Si'); await flush();
        if (stage !== 'future') { f.futInfo.next({ assetCode: 'SI', shortName: 'Si' }); await flush(); }
        if (stage === 'positions') { f.contracts.next(['SI']); await flush(); }
        const source = stage === 'future' ? f.futInfo : stage === 'contracts' ? f.contracts : f.positions;
        expect(source.observed).toBe(true);
        f.renderer.dispose();
        expect(source.observed).toBe(false);
        await request; await flush();
        expect(f.dataService.getAllContracts.calls.count()).toBe(stage === 'future' ? 0 : 1);
        expect(f.dataService.getOpenPositionsByContract.calls.count()).toBe(stage === 'positions' ? 1 : 0);
        expect((await f.repository.load('Si')).status).toBe('error');
        expect(f.common.getFutInfo).toHaveBeenCalledTimes(1);
        expect(f.pending.size).toBe(0);
        f.hint.show('late', { x: 0, y: 0 });
        expect(f.hint.ensureHintElement()).toBeNull();
      } finally { f.cleanup(); }
    });
  });
}


describe('Footprint real painters CPU sample', () => {
  it('paints and disposes a 10000-bar chart with indicators and records frame cost', () => {
    const f = rendererFixture(true, 10000);
    try {
      const snapshot = { ...f.snapshot, settings: { ...f.snapshot.settings, Indicators: [
        { id: 'sma', type: 'sma', params: { period: 20 }, panel: 'chart' as const },
        { id: 'ema', type: 'ema', params: { period: 20 }, panel: 'chart' as const },
      ] } };
      f.renderer.applySnapshot(snapshot); f.tick();
      const frames: number[] = [];
      for (let i = 0; i < 25; i++) {
        const start = performance.now(); f.renderer.drawClusterView(); f.tick();
        if (i >= 5) frames.push(performance.now() - start);
      }
      frames.sort((a, b) => a - b);
      console.log('FOOTPRINT_PROFILE ' + JSON.stringify({ bars: 10000, samples: frames.length,
        frameMedianMs: frames[10], frameP95Ms: frames[18], width: f.canvas.width, height: f.canvas.height,
        visibleBars: f.renderer.maxIndex - f.renderer.minIndex + 1 }));
      expect(f.paint).toHaveBeenCalledTimes(26); expect(f.pending.size).toBe(0);
      expect(f.renderer.indicatorEngine.getChartSeries().length).toBe(2);
      expect(f.canvas.getContext('2d').getImageData(0, 0, f.canvas.width, f.canvas.height).data.some(value => value !== 0)).toBe(true);
      f.renderer.dispose(); f.tick(); expect(f.pending.size).toBe(0);
    } finally { f.cleanup(); }
  });
});
