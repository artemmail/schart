import type { Observable } from 'rxjs';
import type { HammerInput } from 'hammerjs';
import type { ChartSettings } from 'src/app/models/ChartSettings';
import type { FootPrintParameters } from 'src/app/models/Params';
import type { ColumnEx } from 'src/app/models/Column';
import type { MarkLineLevel, LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import type { HintContainerService } from '../services/hint-container.service';
import type { FootprintLayoutDto } from '../services/footprint-layout.service';
import type { FootprintIndicatorEngine } from '../indicators/indicator-engine';
import type { MarkUpManager } from '../markup/markup-manager';
import type { canvasPart } from '../views/canvas-part';
import type { RenderContext } from './footprint-context';
import type { Matrix, Point, Rectangle } from './matrix';

export type ChartPointerEvent = MouseEvent | TouchEvent | WheelEvent | HammerInput | Point;
export type GestureTarget = canvasPart & Partial<{
  onMouseEnter(): void; onMouseLeave(): void; onMouseUp(point?: Point): void;
  onMouseMovePressed(point: Point): void;
  onPanStart(event: HammerInput): void; onPan(event: HammerInput): void; onPanEnd(event: HammerInput): void;
  onPinchStart(event: HammerInput): void; onPinchMove(event: HammerInput): void; onPinchEnd(event: HammerInput): void;
  onSwipe(event: HammerInput): void;
}>;
export interface InputState {
  readonly pressd: Point;
  readonly selectedPoint: Point | null;
  panStartInfo: { event: HammerInput; view: GestureTarget } | null;
  eventToPoint(event: ChartPointerEvent): Point;
}
interface SwipeView {
  checkPoint(point: Point): boolean;
  stopSwipe(): void;
  interruptSwipe(): void;
  onSwipe(event: HammerInput): void;
}
export interface ChartViewport {
  mtx: Matrix;
  readonly mtxMain: Matrix;
  readonly clusterView: Rectangle;
  readonly clusterPricesView: Rectangle;
  readonly clusterTotalViewFill: Rectangle;
  readonly resizeable: Array<canvasPart | null>;
  readonly layout: FootprintLayoutDto | null;
  readonly viewMain: SwipeView | null;
  readonly viewRangeSet: SwipeView | null;
}

export interface ViewCommands {
  requestRender(): void;
  hideHint(): void;
  hideHintElement(): void;
  showHint(content: string, position: Point): void;
  renderHint: HintContainerService['renderHint'];
  editLevel(level: MarkLineLevel, changed: () => void): Observable<unknown>;
  openChart(params: Partial<FootPrintParameters>): void;
  alignMatrix(matrix: Matrix, alignPrice?: boolean): Matrix;
  getInitMatrix(view: Rectangle, data: NonNullable<RenderContext['data']>): Matrix;
  isPriceVisible(): boolean;
  isStartVisible(): boolean;
  oiEnable(): boolean;
  topLinesCount(): number;
}

/** Painters read chart data; interaction uses explicit ports rather than Angular services. */
export interface ChartViewContext extends RenderContext, ViewCommands {
  readonly canvas: HTMLCanvasElement | null;
  readonly viewport: ChartViewport;
  readonly input: InputState;
  readonly marks: Pick<LevelMarksService, 'getDates' | 'getDateMark' | 'getPrices' | 'getPriceMark' | 'togglePrice' | 'toggleDate' | 'updatePriceMark' | 'getFilters'>;
  readonly indicators: Pick<FootprintIndicatorEngine, 'getChartSeries' | 'getClusterOverlays' | 'getPanelSeries'>;
  readonly markup: Pick<MarkUpManager, 'allowPan' | 'onMouseDown' | 'onMouseDownMove' | 'onMouseMove' | 'onMouseUp' | 'selectShape' | 'drawAll'>;
  readonly animations: { animate(step: (time: number) => boolean): () => void };
  readonly views: canvasPart[];
  readonly markupEnabled: boolean;
  readonly caption: string | null;
  readonly clusterWidthScale: number;
  readonly startPrice: number;
  readonly finishPrice: number;
  hiddenHint: boolean;
  selectedColumn: ColumnEx | null;
  selectedPrice: number | null;
  selectedPrice1: number | null;
  translateMatrix: Matrix | null;
  readonly animButtonState: { hover: boolean; pressed: boolean; hoverT: number; pressT: number };
}

export interface ViewsHostContext extends RenderContext {
  readonly canvas: HTMLCanvasElement | null;
  readonly viewContext: ChartViewContext;
  readonly renderContext: RenderContext;
  readonly indicators: Pick<FootprintIndicatorEngine, 'getPanels'>;
  readonly translateMatrix: Matrix | null;
  readonly deltaVolumes: readonly number[];
  views: canvasPart[];
  cancelInteraction(): void;
  resize(): void;
  requestRender(): void;
  getMinMaxIndex(matrix: Matrix): void;
  alignMatrix(matrix: Matrix): Matrix;
  topLinesCount(): number;
}

export interface InputHostContext extends Pick<ChartViewContext, 'canvas' | 'data' | 'FPsettings' | 'viewport' | 'views' | 'translateMatrix' | 'hideHint' | 'requestRender'> {
  FPsettings: ChartSettings;
  dragMode: number | null;
  movedView: GestureTarget | null;
  readonly deltaVolumes: readonly number[];
  resetDeltaVolume(index: number): void;
  consumeDeltaVolume(index: number): number;
  updateDeltaVolume(index: number, value: number): void;
  saveSettings(): void;
}
