import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { FootPrintComponent } from '../footprint/footprint.component';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { FootprintWidgetComponent } from './footprint-widget.component';
import { FootprintDataLoaderService } from '../../services/footprint-data-loader.service';
import { FootprintRealtimeUpdaterService } from '../../services/footprint-realtime-updater.service';
import { FootprintControllerService } from '../../services/footprint-controller.service';
import { FootprintSessionService } from '../../services/footprint-session.service';
import { LevelMarksService, MarkLineLevel } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';

@Component({
  standalone: true, selector: 'app-footprint', template: '<span>{{loadState.status}}</span>',
  providers: [{ provide: FootPrintComponent, useExisting: forwardRef(() => TestRendererComponent) }],
})
class TestRendererComponent {
  @Input() loadState: any;
  @Input() caption: any;
  @Input() postInit: any;
  @Output() retryRequested = new EventEmitter<void>();
  @Output() settingsSaveRequested = new EventEmitter<any>();
  @Output() settingsChanged = new EventEmitter<any>();
  applySnapshot = jasmine.createSpy('applySnapshot');
  clearSession = jasmine.createSpy('clearSession');
  handleRealtimeUpdate = jasmine.createSpy('handleRealtimeUpdate');
  hintService = { destroy: () => undefined };
  bindRealtime() {}
  resize() {}
  dispose() {}
}

describe('FootprintWidget marks ownership', () => {
  it('publishes loading and ready through actual view lifecycle without change detection errors', async () => {
    const state = new BehaviorSubject<any>({ status: 'idle', sessionId: 0 });
    const snapshot = { sessionId: 1, params: { ticker: 'B', period: 1, priceStep: 1, candlesOnly: false },
      settings: {}, data: {}, presetIndex: 2, presets: [] };
    const session = { state$: state, updates$: new Subject(), destroy: () => undefined,
      initialize: async () => {
        state.next({ status: 'loading', sessionId: 1, params: snapshot.params });
        await Promise.resolve();
        state.next({ status: 'ready', sessionId: 1, snapshot });
        return true;
      } };
    TestBed.configureTestingModule({ imports: [FootprintWidgetComponent] });
    TestBed.overrideComponent(FootprintWidgetComponent, { set: { imports: [TestRendererComponent] } });
    TestBed.overrideProvider(FootprintSessionService, { useValue: session });
    TestBed.overrideProvider(FootprintControllerService, { useValue: { bindRenderer: () => undefined, destroy: () => undefined, initialize: (...args: any[]) => (session as any).initialize(...args) } });
    TestBed.overrideProvider(FootprintRealtimeUpdaterService, { useValue: {} });
    TestBed.overrideProvider(LevelMarksService, { useValue: {} });
    TestBed.overrideProvider(FootprintDataLoaderService, { useValue: {} });
    const fixture = TestBed.createComponent(FootprintWidgetComponent);
    fixture.componentInstance.params = snapshot.params;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ready');
    expect((fixture.componentInstance.renderer as any).applySnapshot).toHaveBeenCalledOnceWith(snapshot);
    fixture.destroy();
  });

  it('applies only complete snapshots and stops observing the session after destroy', () => {
    const state = new BehaviorSubject<any>({ status: 'idle', sessionId: 0 });
    const updates = new Subject<any>();
    const session = { state$: state, updates$: updates, destroy: jasmine.createSpy('destroy') };
    TestBed.configureTestingModule({ imports: [FootprintWidgetComponent] });
    TestBed.overrideComponent(FootprintWidgetComponent, { set: { template: '', imports: [] } });
    TestBed.overrideProvider(FootprintSessionService, { useValue: session });
    TestBed.overrideProvider(FootprintControllerService, { useValue: { bindRenderer: () => undefined, destroy: () => undefined, initialize: (...args: any[]) => (session as any).initialize(...args) } });
    TestBed.overrideProvider(FootprintRealtimeUpdaterService, { useValue: {} });
    TestBed.overrideProvider(LevelMarksService, { useValue: {} });
    TestBed.overrideProvider(FootprintDataLoaderService, { useValue: {} });
    const fixture = TestBed.createComponent(FootprintWidgetComponent);
    const renderer = {
      applySnapshot: jasmine.createSpy('applySnapshot'), clearSession: jasmine.createSpy('clearSession'),
      handleRealtimeUpdate: jasmine.createSpy('handleRealtimeUpdate'), hintService: { destroy: () => undefined },
      dispose: jasmine.createSpy('dispose'),
    };
    fixture.componentInstance.renderer = renderer as any;
    (fixture.componentInstance as any).connectDataStreams();
    state.next({ status: 'loading', sessionId: 1, params: { ticker: 'B' } });
    expect(renderer.applySnapshot).not.toHaveBeenCalled();
    const snapshot = { sessionId: 1, params: { ticker: 'B', period: 1, priceStep: 1 },
      settings: {}, data: {}, presetIndex: 2, presets: [] };
    state.next({ status: 'ready', sessionId: 1, snapshot });
    expect(renderer.applySnapshot).toHaveBeenCalledOnceWith(snapshot);
    expect(fixture.componentInstance.params.ticker).toBe('B');
    state.next({ status: 'error', sessionId: 2, params: { ticker: 'C' }, message: 'failed' });
    expect(fixture.componentInstance.loadState.status).toBe('error');
    expect(renderer.clearSession).toHaveBeenCalledTimes(3);
    fixture.destroy();
    state.next({ status: 'ready', sessionId: 3, snapshot });
    updates.next({ sessionId: 3, type: 'cluster', merged: true });
    expect(renderer.applySnapshot).toHaveBeenCalledTimes(1);
    expect(renderer.handleRealtimeUpdate).not.toHaveBeenCalled();
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it('provides independent mark stores to two widget injectors', async () => {
    const post = jasmine.createSpy('post').and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [FootprintWidgetComponent],
      providers: [{ provide: HttpClient, useValue: {
        get: (_url: string, options: any) => of([{ price: 100, comment: options.params.ticker, color: '#fff' }]),
        post,
      } }],
    });
    // Keep the widget providers, but skip canvas and unrelated loading here.
    TestBed.overrideComponent(FootprintWidgetComponent, { set: { template: '', imports: [] } });
    TestBed.overrideProvider(FootprintDataLoaderService, { useValue: { destroy: () => undefined } });
    TestBed.overrideProvider(FootprintControllerService, { useValue: { destroy: () => undefined } });
    TestBed.overrideProvider(FootprintRealtimeUpdaterService, { useValue: { destroy: () => undefined } });
    TestBed.overrideProvider(FootprintSessionService, { useValue: { destroy: () => undefined } });
    const firstFixture = TestBed.createComponent(FootprintWidgetComponent);
    const secondFixture = TestBed.createComponent(FootprintWidgetComponent);
    const first = firstFixture.debugElement.injector.get(LevelMarksService);
    const second = secondFixture.debugElement.injector.get(LevelMarksService);
    expect(first).not.toBe(second);
    const params = { ticker: 'SBER', period: 1, priceStep: 1, candlesOnly: false };
    await Promise.all([first.load(params), second.load({ ...params, ticker: 'GAZP' })]);
    first.updatePriceMark(100, new MarkLineLevel('first', '#fff'));
    expect(post.calls.mostRecent().args[1].ticker).toBe('SBER');
    expect(second.getPriceMark(100)?.comment).toBe('GAZP');
    await second.load(params, { skipServer: true });
    expect(first.getPriceMark(100)?.comment).toBe('first');
    firstFixture.destroy();
    secondFixture.destroy();
  });
});
