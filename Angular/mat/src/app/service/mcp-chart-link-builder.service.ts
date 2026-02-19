import { Injectable } from '@angular/core';
import { McpCandlestickChartSpec } from './markdown-renderer.service';

@Injectable({
  providedIn: 'root',
})
export class McpChartLinkBuilderService {
  buildCandlestickUrl(spec: McpCandlestickChartSpec): string {
    const params = new URLSearchParams();
    params.set('ticker', spec.ticker);
    params.set('period', String(spec.period));
    params.set('rperiod', spec.rperiod);
    params.set('mode', spec.mode);

    if (spec.startDate) {
      params.set('startDate', spec.startDate);
    }

    if (spec.endDate) {
      params.set('endDate', spec.endDate);
    }

    return `/CandlestickChart?${params.toString()}`;
  }
}

