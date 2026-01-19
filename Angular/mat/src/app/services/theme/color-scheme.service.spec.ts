import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { ColorSchemeService } from './color-scheme.service';
import { STOCK_CHART_DEFAULT_PALETTE } from './theme.model';

describe('ColorSchemeService', () => {
  let service: ColorSchemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ColorSchemeService);
  });

  it('readPalette returns fallback values when vars are missing', () => {
    const host = document.createElement('div');
    const palette = service.readPalette(host);
    expect(palette.bg).toBe(STOCK_CHART_DEFAULT_PALETTE.bg);
    expect(palette.up).toBe(STOCK_CHART_DEFAULT_PALETTE.up);
    expect(palette.grid).toBe(STOCK_CHART_DEFAULT_PALETTE.grid);
  });

  it('applyTheme updates CSS vars and cache', () => {
    const host = document.createElement('div');
    const palette = service.applyTheme(host, { up: '#00ff00', grid: '#111111' });
    expect(host.style.getPropertyValue('--sc-up')).toBe('#00ff00');
    expect(host.style.getPropertyValue('--sc-grid')).toBe('#111111');
    const cached = service.getPalette(host);
    expect(cached.up).toBe('#00ff00');
    expect(cached.grid).toBe('#111111');
    expect(palette.up).toBe('#00ff00');
  });

  it('themeChanged$ emits on applyTheme', (done) => {
    const host = document.createElement('div');
    service.themeChanged$.pipe(take(1)).subscribe((event) => {
      expect(event.hostEl).toBe(host);
      expect(event.palette.up).toBe('#00ff00');
      done();
    });
    service.applyTheme(host, { up: '#00ff00' });
  });
});
