import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FutureSeriesItem } from 'src/app/service/common.service';

@Component({
  standalone: true,
  selector: 'app-futures-series-table',
  imports: [CommonModule, RouterModule],
  templateUrl: './futures-series-table.component.html',
  styleUrls: ['./futures-series-table.component.css']
})
export class FuturesSeriesTableComponent {
  @Input() futures: FutureSeriesItem[] | null | undefined = [];

  contangoLabel(value?: string | null): string {
    if (value === 'contango') {
      return 'контанго';
    }
    if (value === 'backwardation') {
      return 'бэквордация';
    }
    if (value === 'flat') {
      return 'паритет';
    }
    return '';
  }
}
