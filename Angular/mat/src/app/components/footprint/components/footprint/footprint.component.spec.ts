import { ElementRef } from '@angular/core';
import { Subject, of } from 'rxjs';
import { FootPrintComponent } from './footprint.component';
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
import { FormattingService } from 'src/app/service/FootPrint/Formating/formatting.service';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';

function rendererFixture() {
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
  const renderer = new FootPrintComponent(colors, new FormattingService(),
    { readPalette: () => renderer.palette, setPreset: () => renderer.palette, themeChanged$ } as any,
    { applyPreset: () => undefined, getStoredPreset: () => 'Light' } as any,
    new ElementRef(host), {} as any, new LevelMarksService({ post: () => of({}) } as any), dialog as any, {} as any,
    new FootprintLayoutService(colors), { updateSettings: save } as any,
    dataService as any, common as any, new FootprintStateService(), hint);
  renderer.canvasRef = new ElementRef(canvas);
  renderer.ngAfterViewInit();
  // Exercise real layout/parts ownership; avoid testing every painter here.
  spyOn(canvasPart.prototype, 'drawCanvas');
  const paint = spyOn(renderer.viewsManager, 'renderNow').and.callThrough();
  const prepare = spyOn(renderer.indicatorEngine, 'prepare').and.callThrough();
  const data = new ClusterData({ priceScale: 1, clusterData: Array.from({ length: 20 }, (_, index) => ({
    Number: index + 1, x: new Date(Date.UTC(2026, 8, 28, 10, index)), o: 100, h: 102, l: 99, c: 101,
    q: 100, bq: 50, v: 10000, bv: 5000, oi: 0, cl: [],
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
    themeChanged$, futInfo, contracts, positions, common, dataService, dialog, dialogResult };
}

const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

describe('Footprint renderer resources and frames', () => {
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
      const range = new viewRangeSet(f.renderer, f.renderer.viewsManager.clusterView, new Matrix());
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
        const request = (f.renderer as any).loadOpenPositionsByTicker('Si'); await flush();
        if (stage !== 'future') { f.futInfo.next({ assetCode: 'SI', shortName: 'Si' }); await flush(); }
        if (stage === 'positions') { f.contracts.next(['SI']); await flush(); }
        const source = stage === 'future' ? f.futInfo : stage === 'contracts' ? f.contracts : f.positions;
        expect(source.observed).toBe(true);
        f.renderer.dispose();
        expect(source.observed).toBe(false);
        await request; await flush();
        expect(f.dataService.getAllContracts.calls.count()).toBe(stage === 'future' ? 0 : 1);
        expect(f.dataService.getOpenPositionsByContract.calls.count()).toBe(stage === 'positions' ? 1 : 0);
        expect((f.renderer as any).contractsCache).toBeNull();
        expect((f.renderer as any).openPositionsLoadCache.size).toBe(0);
        expect(f.pending.size).toBe(0);
        f.hint.show('late', { x: 0, y: 0 });
        expect(f.hint.ensureHintElement()).toBeNull();
      } finally { f.cleanup(); }
    });
  });
}
