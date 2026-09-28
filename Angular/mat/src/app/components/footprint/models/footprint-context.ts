import type { FootprintCanvasContext } from '../rendering/footprint-canvas';
import type { ChartSettings } from 'src/app/models/ChartSettings';
import type { FootPrintParameters } from 'src/app/models/Params';
import type { ColumnEx } from 'src/app/models/Column';
import type { StockChartPalette } from 'src/app/services/theme/theme.model';
import type { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import type { FormattingService } from 'src/app/service/FootPrint/Formatting/formatting.service';
import type { ClusterData } from './cluster-data';
import type { Matrix, Point, Rectangle } from './matrix';

/** Read access and geometry only; no Angular component or managers. */
export interface RenderContext {
  readonly data: ClusterData | null;
  readonly ctx: FootprintCanvasContext | null;
  readonly palette: StockChartPalette;
  readonly colorsService: ColorsService;
  readonly formatService: FormattingService;
  readonly FPsettings: ChartSettings;
  readonly params: FootPrintParameters | null;
  readonly minimode: boolean;
  readonly minIndex: number;
  readonly maxIndex: number;
  readonly selectedColumn: ColumnEx | null;
  readonly hiddenHint: boolean;
  readonly pointer: Point | null;
  getBar(matrix: Matrix): Rectangle;
  clusterRect(price: number, column: number, matrix: Matrix): Rectangle;
  clusterRectFontSize(rect: Rectangle, textLength: number): number;
  topVolumes(): boolean;
}

export interface InteractionContext {
  readonly data: ClusterData | null;
  readonly ctx: FootprintCanvasContext | null;
  readonly palette: StockChartPalette;
  readonly colorsService: Pick<ColorsService, 'sscale'>;
  readonly viewport: { readonly view: Rectangle; readonly mtx: Matrix };
  clusterRect2(price: number, column: number, width: number, matrix: Matrix): Rectangle;
  requestRender(): void;
  setCursor(cursor: string): void;
}

export function createRenderContext(host: RenderContext): RenderContext {
  return {
    get data() { return host.data; }, get ctx() { return host.ctx; },
    get palette() { return host.palette; }, get colorsService() { return host.colorsService; },
    get formatService() { return host.formatService; }, get FPsettings() { return host.FPsettings; },
    get params() { return host.params; }, get minimode() { return host.minimode; },
    get minIndex() { return host.minIndex; }, get maxIndex() { return host.maxIndex; },
    get selectedColumn() { return host.selectedColumn; }, get hiddenHint() { return host.hiddenHint; },
    get pointer() { return host.pointer; },
    getBar: matrix => host.getBar(matrix),
    clusterRect: (price, column, matrix) => host.clusterRect(price, column, matrix),
    clusterRectFontSize: (rect, length) => host.clusterRectFontSize(rect, length),
    topVolumes: () => host.topVolumes(),
  };
}
