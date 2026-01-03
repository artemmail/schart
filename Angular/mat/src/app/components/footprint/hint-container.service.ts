import { Injectable, OnDestroy } from '@angular/core';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';
import { ColumnEx } from './columns/cluster-column-base';
import { canvasPart } from './views/canvas-part';
import { Matrix, Point } from './matrix';
import { FormattingService } from 'src/app/service/FootPrint/Formating/formatting.service';
import { drob, MoneyToStr } from 'src/app/service/FootPrint/utils';

interface HintRenderOptions {
  event: MyMouseEvent;
  mtx: Matrix;
  clusterData: ColumnEx[] | null | undefined;
  priceScale: number;
  views: Array<canvasPart>;
  settings: ChartSettings;
  formatService: FormattingService;
  onShow: (content: string, position: Point) => void;
  onHide: () => void;
}

@Injectable()
export class HintContainerService implements OnDestroy {
  private hintElement: HTMLDivElement | null = null;

  ngOnDestroy(): void {
    this.removeHintElement();
  }

  show(content: string, position: { x: number; y: number }): void {
    const hint = this.ensureHintElement();

    hint.innerHTML = content;
    hint.style.overflow = 'visible';
    hint.style.display = 'block';
    hint.style.left = `${position.x}px`;
    hint.style.top = `${position.y}px`;
  }

  renderHint(options: HintRenderOptions): void {
    if (!options.settings.ToolTip) {
      return;
    }

    const result = this.buildHintContent(options);

    if (!result) {
      options.onHide();
      return;
    }

    options.onShow(result.content, result.position);
  }

  destroy(): void {
    this.removeHintElement();
  }

  private buildHintContent(options: HintRenderOptions):
    | { content: string; position: Point }
    | null {
    const point = options.mtx.inverse().applyToPoint1(options.event.position);
    const n = Math.floor(point.x);
    const clusterData = options.clusterData;

    if (!clusterData || n < 0 || n >= clusterData.length) {
      return null;
    }

    const col: ColumnEx = clusterData[n] as ColumnEx;
    const item = (label: string, val: string | number | never) =>
      `<li style='font-size: 12px;'><b>${label}: </b>${val}</li>`;

    let data = '';

    if ('Number' in col && col.Number != 0) {
      data += item('Number', col.Number);
      data += item('Price', col.c);
      data += item('Contracts', col.q);
      data += item('Direction', col.bq ? 'Buy' : 'Sell');
      data += item('Volume', MoneyToStr(col.v));
    } else {
      data += item('Opn', (col as ColumnEx).o);
      data += item('Cls', col.c);
      data += item('Hi', col.h);
      data += item('Lo', col.l);

      if (!options.settings.ExtendedToolTip) {
        data += item('Contracts', col.q);
        data += item('Buy', `${drob(col.bq)} (${drob((col.bq * 100) / col.q, 2)}%)`);
      } else {
        if (col.bq > 0) {
          data += item('Buy', `${drob(col.bq)} (${drob((col.bq * 100) / col.q, 2)}%)`);
        }
        if (col.q - col.bq > 0) {
          data += item('Sell', `${drob(col.q - col.bq)} (${drob(((col.q - col.bq) * 100) / col.q, 2)}%)`);
        }
      }

      data += item('Volume', MoneyToStr(col.v));
    }

    for (const view of options.views) {
      if ('getLegendLine' in view) {
        const legend = (view as any).getLegendLine();
        data += item(legend.Text, legend.Value);
      }
    }

    const roundedPrice = drob(
      Math.round(point.y / options.priceScale) * options.priceScale,
    );

    if ('cl' in col) {
      for (let i = 0; i < col.cl.length; i++) {
        if (col.cl[i].p - roundedPrice == 0) {
          data += 'Cluster Data';
          data += item('Price', col.cl[i].p);
          data += item('Trades', col.cl[i].ct);
          data += item('Max trade', col.cl[i].mx);

          if (!options.settings.ExtendedToolTip) {
            data += item('Contracts', drob(col.cl[i].q));
            data += item(
              'Buy',
              `${drob(col.cl[i].bq, 3)} (${drob((col.cl[i].bq * 100) / col.cl[i].q, 2)}%)`,
            );
          } else {
            if (col.cl[i].bq > 0) {
              data += item(
                'Buy',
                `${drob(col.cl[i].bq, 2)} (${drob((col.cl[i].bq * 100) / col.cl[i].q, 3)}%)`,
              );
            }
            if (col.cl[i].q - col.cl[i].bq > 0) {
              data += item(
                'Sell',
                `${drob(col.cl[i].q - col.cl[i].bq, 3)} (${drob(((col.cl[i].q - col.cl[i].bq) * 100) / col.cl[i].q, 2)}%)`,
              );
            }
          }
        }
      }
    }

    data += item('Date', options.formatService.toStr(col.x));
    data += item('Time', options.formatService.TimeFormat2(col.x));

    const hintContent = `<ul style='font-size: 10px;margin: 0; padding: 0px;list-style-type:none'>${data} </ul>`;

    const position = {
      x: options.event.screen.x / window.devicePixelRatio + 5,
      y: options.event.screen.y / window.devicePixelRatio + 5,
    };

    return { content: hintContent, position };
  }

  ensureHintElement(): HTMLDivElement {
    if (!this.hintElement) {
      this.hintElement = document.createElement('div');
      this.hintElement.id = 'hint';
      document.body.appendChild(this.hintElement);
    }

    return this.hintElement;
  }

  hide(): void {
    if (!this.hintElement) {
      return;
    }
    this.hintElement.style.overflow = 'hidden';
    this.hintElement.style.display = 'none';
  }

  private removeHintElement(): void {
    if (this.hintElement?.parentNode) {
      this.hintElement.parentNode.removeChild(this.hintElement);
    }
    this.hintElement = null;
  }
}


