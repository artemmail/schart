import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { CommonService } from 'src/app/service/common.service';
import { FootprintWidgetComponent } from '../../footprint/components/footprint-widget/footprint-widget.component';

const instruments = [
  { alias: 'MX', priceStep: 50 },
  { alias: 'BR', priceStep: 0.02 },
  { alias: 'Si', priceStep: 10 },
  { alias: 'GD', priceStep: 1 },
];

@Component({
  standalone: true,
  selector: 'app-multi',
  imports: [AsyncPipe, FootprintWidgetComponent],
  templateUrl: './multi.component.html',
  styleUrl: './multi.component.css',
})
export class MultiComponent {
  private readonly common = inject(CommonService);

  readonly charts$ = this.common.ModifyTickers(instruments.map(({ alias }) => alias).join(',')).pipe(
    map(contracts => instruments.flatMap(({ alias, priceStep }): FootPrintParameters[] => {
      const ticker = contracts.find(({ Value }) =>
        Value.length > alias.length && Value.toUpperCase().startsWith(alias.toUpperCase())
      )?.Value;

      return ticker ? [{ ticker, period: 15, priceStep, candlesOnly: true }] : [];
    })),
    catchError(() => of([])),
  );
}
