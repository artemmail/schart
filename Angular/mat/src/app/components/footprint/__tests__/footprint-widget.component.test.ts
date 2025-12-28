jest.mock('hammerjs', () => ({}));

import { Subject } from 'rxjs';
import { FootprintWidgetComponent } from '../footprint-widget.component';
import { FootPrintComponent } from '../footprint.component';
import { FootPrintParameters } from 'src/app/models/Params';
import { ChartSettings } from 'src/app/models/ChartSettings';

describe('FootprintWidgetComponent', () => {
  const params: FootPrintParameters = {
    ticker: 'TST',
    period: 1,
    priceStep: 1,
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-02T00:00:00Z'),
    candlesOnly: false,
  };

  class MockDestroyRef {
    onDestroy() {
      /* noop */
    }
  }

  class MockResizeObserver {
    constructor(private cb: () => void) {}
    observe() {
      this.cb();
    }
    disconnect() {}
  }

  beforeAll(() => {
    (global as any).ResizeObserver = MockResizeObserver as any;
    if (!(global as any).document) {
      (global as any).document = { createElement: () => ({}) } as any;
    }
    if (!(global as any).window) {
      (global as any).window = {
        document: (global as any).document,
        addEventListener: () => {},
        removeEventListener: () => {},
      } as any;
    }
  });

  it('forwards loader streams as renderer commands', async () => {
    const data$ = new Subject<any>();
    const settings$ = new Subject<ChartSettings | null>();
    const params$ = new Subject<FootPrintParameters | null>();
    const presets$ = new Subject<any[]>();
    const updates$ = new Subject<any>();

    const renderer: Partial<FootPrintComponent> = {
      bindRealtime: jest.fn(),
      applyData: jest.fn(),
      applySettings: jest.fn(),
      applyParams: jest.fn(),
      handleRealtimeUpdate: jest.fn(),
      resize: jest.fn(),
    } as any;

    const dataLoader = {
      data$,
      settings$,
      params$,
      presets$,
      initialize: jest.fn().mockResolvedValue(true),
      reload: jest.fn().mockResolvedValue(true),
      destroy: jest.fn(),
    };

    const realtime = {
      updates$,
      configure: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn(),
    };

    const component = new FootprintWidgetComponent(
      dataLoader as any,
      realtime as any,
      new MockDestroyRef() as any,
      { nativeElement: document.createElement('div') } as any
    );

    component.renderer = renderer as FootPrintComponent;
    component.params = params;
    component.presetIndex = 1;

    await component.ngAfterViewInit();

    const clusterData = { clusterData: [] } as any;
    data$.next(clusterData);
    expect(renderer.applyData).toHaveBeenCalledWith(clusterData);

    const settings = { CandlesOnly: true } as ChartSettings;
    settings$.next(settings);
    expect(renderer.applySettings).toHaveBeenCalledWith(settings);

    params$.next(params);
    expect(renderer.applyParams).toHaveBeenCalledWith(params);

    updates$.next({ type: 'ticks' });
    expect(renderer.handleRealtimeUpdate).toHaveBeenCalledWith({ type: 'ticks' });

    presets$.next([{ Text: 'p1', Value: 1 }]);
    expect((renderer as any).presetItems).toEqual([{ Text: 'p1', Value: 1 }]);
  });
});
