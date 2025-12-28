import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintParameters } from 'src/app/models/Params';
import { FootprintLayoutDto, FootprintLayoutService, FootprintMatricesDto } from './footprint-layout.service';
import { FootPrintComponent } from './footprint.component';
import { FootprintStateService } from './footprint-state.service';
import { Matrix } from './matrix';

export interface FootprintLayoutState {
  layout: FootprintLayoutDto;
  baseMatrix: Matrix;
}

export interface FootprintRenderCommands extends FootprintLayoutState {
  matrices: FootprintMatricesDto;
}

@Injectable()
export class FootprintSettingsManager {
  private renderer: FootPrintComponent | null = null;
  private settings: ChartSettings | null = this.state.snapshot.settings;
  private params: FootPrintParameters | null = null;

  private layoutStateSubject = new BehaviorSubject<FootprintLayoutState | null>(null);
  readonly layoutState$ = this.layoutStateSubject.asObservable();

  private renderCommandsSubject = new BehaviorSubject<FootprintRenderCommands | null>(null);
  readonly renderCommands$ = this.renderCommandsSubject.asObservable();

  constructor(
    private layoutService: FootprintLayoutService,
    private state: FootprintStateService
  ) {}

  attachRenderer(renderer: FootPrintComponent): void {
    this.renderer = renderer;
  }

  setSettings(settings: ChartSettings): void {
    this.settings = settings;
    this.state.setSettings(settings);
    this.recalculate();
  }

  setParams(params: FootPrintParameters): void {
    this.params = params;
    this.state.setParams(params);
    this.recalculate();
  }

  recalculate(): void {
    if (!this.renderer || !this.settings || !this.params) {
      return;
    }

    const { canvas, data } = this.renderer;
    if (!canvas || !data) {
      return;
    }

    const layout = this.layoutService.calculateLayout({
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      deltaVolumes: this.renderer.deltaVolumes,
      minimode: this.renderer.minimode,
      settings: this.settings,
      data,
      topLinesCount: this.renderer.topLinesCount(),
    });

    const baseMatrix = this.layoutService.getInitialMatrix(
      layout.clusterView,
      data,
      this.settings,
      this.params
    );

    const matrices = this.layoutService.buildMatrices(
      baseMatrix,
      layout,
      this.settings,
      data,
      this.renderer.topLinesCount(),
      this.renderer.translateMatrix
    );

    const layoutState: FootprintLayoutState = { layout, baseMatrix };
    const renderCommands: FootprintRenderCommands = { ...layoutState, matrices };

    this.state.setLayoutState(layout, matrices, baseMatrix);
    this.layoutStateSubject.next(layoutState);
    this.renderCommandsSubject.next(renderCommands);
  }
}
