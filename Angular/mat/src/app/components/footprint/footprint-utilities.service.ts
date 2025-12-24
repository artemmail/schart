import { Injectable } from '@angular/core';
import { FormattingService } from 'src/app/service/FootPrint/Formating/formatting.service';
import { FootPrintParameters } from 'src/app/models/Params';
import { ClusterData } from './clusterData';
import { saveAs } from 'file-saver';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FootprintUtilitiesService {
  constructor(
    private formatService: FormattingService,
    private settingsService: ChartSettingsService
  ) {}

  async loadPresets(): Promise<SelectListItemNumber[]> {
    return await firstValueFrom(this.settingsService.getPresets());
  }

  exportCsv(params: FootPrintParameters, data: ClusterData) {
    if (params.period === 0) {
      alert(
        'Невозможно скачать тиковый график. Есть возможность купить базу данных всех сделок'
      );
      return;
    }

    const userConfirmed = confirm(
      'Сохранить свечи в формате CSV (Можно использовать в Excel)?'
    );
    if (!userConfirmed) {
      return;
    }

    let csvContent = 'Date;Opn;High;Low;Close;Volume;BidVolume;Quantity;';
    if (data.clusterData.length > 0 && data.clusterData[0].oi > 0) {
      csvContent += 'OpenPositions;';
    }
    csvContent += '\n';

    data.clusterData.forEach((candle: any) => {
      const row = [
        this.formatService.jDateToStr(candle.x),
        candle.o,
        candle.h,
        candle.l,
        candle.c,
        candle.v,
        candle.bv,
        candle.q,
      ];
      if (candle.oi != 0) {
        row.push(candle.oi);
      }
      csvContent += row.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/plain;charset=' + document.characterSet });
    const filename = `${params.ticker}_${this.formatService.jDateToStrD(params.startDate)}-${this.formatService.jDateToStrD(params.endDate)}_${params.period}.csv`;
    saveAs(blob, filename);
  }
}
