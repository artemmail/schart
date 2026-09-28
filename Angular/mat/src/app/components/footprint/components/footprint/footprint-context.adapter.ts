import type { FootPrintComponent } from './footprint.component';
import type { ChartViewContext, ViewsHostContext, InputHostContext } from '../../models/chart-runtime-context';
import type { FrameContext } from '../../rendering/footprint-frame-renderer';

export function createFrameContext(host: FootPrintComponent): FrameContext {
  return {
    get ready() { return host.isFrameReady(); }, get data() { return host.data; }, get params() { return host.params; },
    get settings() { return host.FPsettings; }, get viewport() { return host.viewsManager; },
    get translateMatrix() { return host.translateMatrix; }, get indicators() { return host.indicatorEngine; },
    initialMatrix: (view, data) => host.getInitMatrix(view, data), alignMatrix: matrix => host.alignMatrix(matrix),
    updateVisibleRange: matrix => host.getMinMaxIndex(matrix),
  };
}

export function createChartViewContext(host: FootPrintComponent): ChartViewContext {
  return {
    get data() { return host.data; }, get ctx() { return host.ctx; },
    get palette() { return host.palette; }, get colorsService() { return host.colorsService; },
    get formatService() { return host.formatService; }, get FPsettings() { return host.FPsettings; },
    get params() { return host.params; }, get minimode() { return host.minimode; },
    get minIndex() { return host.minIndex; }, get maxIndex() { return host.maxIndex; },
    get selectedColumn() { return host.selectedColumn; }, set selectedColumn(value) { host.selectedColumn = value; },
    get hiddenHint() { return host.hiddenHint; }, set hiddenHint(value) { host.hiddenHint = value; }, get pointer() { return host.pointer; },
    get canvas() { return host.canvas; }, get viewport() { return host.viewsManager; },
    get input() { return host.mouseAndTouchManager; }, get marks() { return host.levelMarksService; },
    get indicators() { return host.indicatorEngine; }, get markup() { return host.markupManager; },
    get animations() { return host.renderScheduler; }, get views() { return host.views; },
    get markupEnabled() { return host.markupEnabled; }, get caption() { return host.caption; },
    get clusterWidthScale() { return host.clusterWidthScale; },
    get startPrice() { return host.startPrice; }, get finishPrice() { return host.finishPrice; },
    get selectedPrice() { return host.selectedPrice; }, set selectedPrice(value) { host.selectedPrice = value; },
    get selectedPrice1() { return host.selectedPrice1; }, set selectedPrice1(value) { host.selectedPrice1 = value; },
    get translateMatrix() { return host.translateMatrix; }, set translateMatrix(value) { host.translateMatrix = value; },
    get animButtonState() { return host.animButtonState; },
    getBar: matrix => host.getBar(matrix),
    clusterRect: (price, column, matrix) => host.clusterRect(price, column, matrix),
    clusterRectFontSize: (rect, length) => host.clusterRectFontSize(rect, length),
    topVolumes: () => host.topVolumes(), topLinesCount: () => host.topLinesCount(),
    requestRender: () => host.drawClusterView(), hideHint: () => host.hideHint(),
    hideHintElement: () => host.hintService.hide(), showHint: (content, position) => host.showHint(content, position),
    renderHint: options => host.hintService.renderHint(options),
    editLevel: (level, changed) => host.dialogService.openLevelSettings(level, changed),
    openChart: params => { void host.router.navigate(['/FootPrint'], { queryParams: params }); },
    alignMatrix: (matrix, alignPrice) => host.alignMatrix(matrix, alignPrice),
    getInitMatrix: (view, data) => host.getInitMatrix(view, data),
    isPriceVisible: () => host.isPriceVisible(), isStartVisible: () => host.isStartVisible(), oiEnable: () => host.oiEnable(),
  };
}

export function createViewsHostContext(host: FootPrintComponent): ViewsHostContext {
  return {
    ...host.renderContext,
    // Preserve live reads when snapshots, palette or viewport are replaced.
    get data() { return host.data; }, get ctx() { return host.ctx; }, get params() { return host.params; },
    get FPsettings() { return host.FPsettings; }, get palette() { return host.palette; },
    get minIndex() { return host.minIndex; }, get maxIndex() { return host.maxIndex; },
    get minimode() { return host.minimode; }, get selectedColumn() { return host.selectedColumn; },
    get hiddenHint() { return host.hiddenHint; }, get pointer() { return host.pointer; },
    get canvas() { return host.canvas; }, get viewContext() { return host.viewContext; },
    get renderContext() { return host.renderContext; }, get indicators() { return host.indicatorEngine; },
    get translateMatrix() { return host.translateMatrix; },
    get deltaVolumes() { return host.deltaVolumes; },
    get views() { return host.views; }, set views(value) { host.views = value; },
    cancelInteraction: () => host.mouseAndTouchManager?.cancelInteraction(),
    resize: () => host.resize(), requestRender: () => host.drawClusterView(),
    getMinMaxIndex: matrix => host.getMinMaxIndex(matrix), alignMatrix: matrix => host.alignMatrix(matrix),
    topLinesCount: () => host.topLinesCount(),
  };
}

export function createInputHostContext(host: FootPrintComponent): InputHostContext {
  return {
    get canvas() { return host.canvas; }, get data() { return host.data; },
    get FPsettings() { return host.FPsettings; }, set FPsettings(value) { host.FPsettings = value; },
    get viewport() { return host.viewsManager; }, get views() { return host.views; },
    get translateMatrix() { return host.translateMatrix; }, set translateMatrix(value) { host.translateMatrix = value; },
    get dragMode() { return host.dragMode; }, set dragMode(value) { host.dragMode = value; },
    get movedView() { return host.movedView; }, set movedView(value) { host.movedView = value; },
    get deltaVolumes() { return host.deltaVolumes; },
    hideHint: () => host.hideHint(), requestRender: () => host.drawClusterView(), saveSettings: () => host.saveSettings(),
    resetDeltaVolume: index => host.resetDeltaVolume(index), consumeDeltaVolume: index => host.consumeDeltaVolume(index),
    updateDeltaVolume: (index, value) => host.updateDeltaVolume(index, value),
  };
}
