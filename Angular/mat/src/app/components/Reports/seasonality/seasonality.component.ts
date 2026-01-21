import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { TickerAutocompleteComponent } from '../../Controls/ticker-autocomplete/ticker-autocomplete.component';
import { ReportsService } from 'src/app/service/reports.service';
import { MaterialModule } from 'src/app/material.module';
import { ColorSchemeService } from 'src/app/services/theme/color-scheme.service';
import { StockChartPalette, STOCK_CHART_DEFAULT_PALETTE } from 'src/app/services/theme/theme.model';


@Component({
  selector: 'app-seasonality',
  templateUrl: './seasonality.component.html',
  styleUrls: ['./seasonality.component.css'],
    standalone: true,
  imports: [MaterialModule, TickerAutocompleteComponent]
})
export class SeasonalityComponent implements OnInit, AfterViewInit, OnDestroy {
  

 
  chartHtml: SafeHtml = '';
  @Input() ticker:string = "SBER";
  palette: StockChartPalette = { ...STOCK_CHART_DEFAULT_PALETTE };

  private chartData: any[] | null = null;
  private themePreset: 'Light' | 'Dark' = 'Light';
  private themeObserver?: MutationObserver;
  

  constructor(
    private sanitizer: DomSanitizer,
    private reportsService: ReportsService,
    private titleService: Title,
    private colorSchemeService: ColorSchemeService,
    private hostRef: ElementRef<HTMLElement>
  ) {
    titleService.setTitle("Таблица сезонной активности рынка акций");
    
   }

  ngOnInit() {
    
  }

  onTickerSelected(ticker: any) {

    this.loadChartData(ticker);
  }

  ngAfterViewInit() {
    this.applyThemePreset();
    this.watchThemePreset();
    // Загружать данные после завершения инициализации представлений
    this.loadChartData(this.ticker);
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
  }


 


  loadChartData(ticker:string) {
    this.applyThemePreset();
    this.reportsService.getSeasonality(ticker)
    .subscribe(data => {
      this.chartData = data ?? [];
      this.chartHtml = this.buildChart(this.chartData);
    });
  }

  buildChart(data: any[]): SafeHtml {
    let res = "";
    let max = 0;
    const borderColor = this.palette.gridSoft || this.palette.grid;
    const textColor = this.palette.text;
    const scaleMaxFallback = 1;
    for (let i = 1; i < data.length; i++) {
      for (let j = 1; j < data[i].length; j++) {
        const value = Number(data[i][j]);
        if (Number.isFinite(value)) {
          max = Math.max(max, Math.abs(value));
        }
      }
    }
    const scaleMax = max > 0 ? max : scaleMaxFallback;
    for (let i = 0; i < data.length; i++) {
      res += '<table style="background: transparent; border-collapse: collapse;">';
      res += '<tr>';
      for (let j = 0; j < data[i].length; j++) {
        let color = "transparent";
        let t = data[i][j];
        if (i > 0 && j > 0) {
          if (t == null)
            t = '';
          else {
            const numericValue = Number(t);
            if (!Number.isFinite(numericValue)) {
              t = '';
            } else {
              t = numericValue / 100 + "%";
              const intensity = Math.min(Math.abs(numericValue) / scaleMax, 1);
              if (numericValue < 0) {
                color = this.toRgba(this.palette.down, intensity);
              } else {
                color = this.toRgba(this.palette.up, intensity);
              }
            }
          }
        }
        if (t == null) t = '';
        res += this.madediv(t, color, borderColor, textColor);
      }
      res += '</tr>';
    }
    res += '</table>';
    return this.sanitizer.bypassSecurityTrustHtml( res);
  }

  madediv(data: any, color: string, borderColor: string, textColor: string): string {
    // Используйте обратные кавычки для поддержки интерполяции строк
    return `<td style="border: 1px solid ${borderColor}; background:${color}; color:${textColor};"><div style="padding: 0.9em 0; text-align: center; font-size: 13pt; width: 74px;">${data}</div></td>`;
  }

  private applyThemePreset(): void {
    const preset = this.readThemePreset();
    this.themePreset = preset;
    this.palette = this.colorSchemeService.setPreset(this.hostRef.nativeElement, preset);
  }

  private watchThemePreset(): void {
    const docEl = this.hostRef.nativeElement.ownerDocument?.documentElement;
    if (!docEl || typeof MutationObserver === 'undefined') {
      return;
    }
    this.themeObserver = new MutationObserver(() => {
      const preset = this.readThemePreset();
      if (preset === this.themePreset) {
        return;
      }
      this.applyThemePreset();
      if (this.chartData) {
        this.chartHtml = this.buildChart(this.chartData);
      }
    });
    this.themeObserver.observe(docEl, { attributes: true, attributeFilter: ['class'] });
  }

  private readThemePreset(): 'Light' | 'Dark' {
    try {
      const stored = window.localStorage.getItem('uiThemePreset');
      if (stored === 'Dark' || stored === 'Light') {
        return stored;
      }
    } catch {
      // ignore storage failures
    }
    const doc = this.hostRef.nativeElement.ownerDocument;
    if (doc?.documentElement?.classList.contains('mat-dark-theme') || doc?.body?.classList.contains('mat-dark-theme')) {
      return 'Dark';
    }
    return 'Light';
  }

  private toRgba(color: string, alpha: number): string {
    const clamped = Math.max(0, Math.min(1, alpha));
    const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(color);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${clamped})`;
    }

    let hex = color.trim().replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length < 6) {
      return `rgba(0, 0, 0, ${clamped})`;
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }


}
