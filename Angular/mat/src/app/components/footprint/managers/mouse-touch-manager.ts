import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { Point } from '../models/matrix';
import * as Hammer from 'hammerjs';
import HammerManager = Hammer.HammerManager;
import HammerInput = Hammer.HammerInput;
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';
import {
  VolumeHeightKeyOrder,
  getVolumeHeightDefaults,
  normalizeVolumeHeights,
} from 'src/app/models/volume-heights';
import { viewIndicatorPanel } from '../views/view-indicator-panel';

export class MouseAndTouchManager {
  footprint: FootPrintComponent;
  panStartInfo: { event: any; view: any } | any;
  selectedPoint: any;
  pressd: Point = { x: 0, y: 0 };
  private hammer: HammerManager;
  private dragIndicatorPanelId: string | null = null;
  private dragIndicatorStartHeight: number | null = null;
  private hoverView: any | null = null;

  constructor(footprint_: FootPrintComponent) {
    this.footprint = footprint_;
    const canvas = this.footprint.canvas;

    this.hammer = new Hammer(canvas);
    //this.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    this.hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });

    this.hammer.get('pinch').set({ enable: true });

    this.hammer.on('panstart', this.onPanStart);
    this.hammer.on('panmove', this.onPanMove);
    this.hammer.on('panend', this.onPanEnd);

    this.hammer.on('pinchstart', this.onPinchStart);
    this.hammer.on('pinchmove', this.onPinchMove);
    this.hammer.on('pinchend', this.onPinchEnd);

    this.hammer.on('swipe', this.onSwipe);

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseout', this.onMouseOut);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('wheel', this.onMouseWheel);

    canvas.addEventListener('contextmenu', this.onRightClick);
    canvas.addEventListener('dblclick', this.onDoubleClick);

    canvas.addEventListener('click', this.onTap);

    this.panStartInfo = null;
  }

  onMouseOut = (event?: MouseEvent): void => {
    if (event) {
      this.updateHover(null);
    }
    this.footprint.viewsManager.drawClusterView();
    this.footprint.hideHint();
  };

  private resolveHoverView(point: Point): any | null {
    for (let i = this.footprint.views.length - 1; i >= 0; i--) {
      const view = this.footprint.views[i];
      if (!view || !view.checkPoint) continue;
      if (
        view.checkPoint(point) &&
        ('onMouseEnter' in view || 'onMouseLeave' in view)
      ) {
        return view;
      }
    }
    return null;
  }

  private updateHover(point: Point | null): void {
    const next = point ? this.resolveHoverView(point) : null;
    if (next === this.hoverView) return;

    if (this.hoverView && 'onMouseLeave' in this.hoverView) {
      (this.hoverView as any).onMouseLeave();
    }
    if (next && 'onMouseEnter' in next) {
      (next as any).onMouseEnter();
    }

    this.hoverView = next;
  }

  onMouseUp = (event?: MouseEvent): void => {
    const FPsettings = this.footprint.FPsettings;
    if (this.footprint.dragMode != null) {
      const resizable = this.footprint.viewsManager.resizeable[this.footprint.dragMode];
      if (resizable instanceof viewIndicatorPanel) {
        this.footprint.saveSettings();
        this.footprint.dragMode = null;
        this.dragIndicatorPanelId = null;
        this.dragIndicatorStartHeight = null;
        return;
      }

      const dragModeIndex = this.footprint.dragMode;
      const deltaVolume = this.footprint.consumeDeltaVolume(dragModeIndex);
      if (deltaVolume !== 0) {
        const dragKey = VolumeHeightKeyOrder[dragModeIndex];
        if (dragKey) {
          const defaults = getVolumeHeightDefaults(!!FPsettings.CandlesOnly);
          const volumesHeight = normalizeVolumeHeights(FPsettings.VolumesHeight, defaults);
          volumesHeight[dragKey] += deltaVolume;
          this.footprint.FPsettings = { ...FPsettings, VolumesHeight: volumesHeight };
          this.footprint.saveSettings();
        }
      }
      this.footprint.dragMode = null;
      return;
    }

    if (this.footprint.movedView !== null) {
      (this.footprint.movedView as any).onMouseUp();
      this.footprint.viewsManager.drawClusterView();
      return;
    }

    if (!event) return;
    const point = this.eventToPoint(event);
    this.updateHover(point);
    if (this.hoverView && 'onMouseUp' in this.hoverView) {
      (this.hoverView as any).onMouseUp(point);
    }
  };



  

  onPinchStart = (point: HammerInput): void => {
   
   // alert(3333);
    
    point.center = this.eventToPoint(point.center);
    for (const view in this.footprint.views)
      if ('onPinchStart' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point.center))
        (this.footprint.views[view] as any).onPinchStart(point.center);
  }
  onPinchMove = (point: HammerInput): void => {
    point.center = this.eventToPoint(point.center);
    for (const view in this.footprint.views)
      if ('onPinchMove' in this.footprint.views[view])
        (this.footprint.views[view] as any).onPinchMove(point);
  }
  onPinchEnd = (point: HammerInput): void => {
    point.center = this.eventToPoint(point.center);
    for (const view in this.footprint.views)
      if ('onPinchEnd' in this.footprint.views[view])
        (this.footprint.views[view] as any).onPinchEnd(point);
  }

  /*

  onPinchStart(point) {
    //  this.hideHint();
    alert(3333)
    for (const view in this.footprint.views)
      if ('onPinchStart' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point.center))
        (this.footprint.views[view] as any).onPinchStart(point);
  }
  onPinchMove(point) {
    point.center = this.eventToPoint(point.center);
    for (const view in this.footprint.views)
      if ('onPinchMove' in this.footprint.views[view])
        (this.footprint.views[view] as any).onPinchMove(point);
  }
  onPinchEnd(point) {
    point.center = this.eventToPoint(point.center);
    for (const view in this.footprint.views)
      if ('onPinchEnd' in this.footprint.views[view])
        (this.footprint.views[view] as any).onPinchEnd(point);
  }
*/

  onPanStart = (event: HammerInput): void => {

    if (this.footprint.dragMode != null) return;
    for (const view in this.footprint.views)
      if ('onPanStart' in this.footprint.views[view])
        if (this.footprint.views[view].checkPoint(this.eventToPoint(event.center))) {
          this.panStartInfo = { event: event, view: this.footprint.views[view] }
        }
  }


  onPanMove = (event: HammerInput): void => {
    event.center = this.eventToPoint(event.center);
    event.deltaX *=  window.devicePixelRatio;
    event.deltaY *=  window.devicePixelRatio;
    if (this.footprint.dragMode != null) return;
    if (this.panStartInfo != null)
      this.panStartInfo.view.onPan(event);
  };

  onPanEnd = (event: HammerInput): void => {
    event.center = this.eventToPoint(event.center);
    if (this.footprint.dragMode != null) return;
    if (this.panStartInfo != null) {
      this.panStartInfo.view.onPanEnd(event);
      this.panStartInfo = null;
    }
  };



  onSwipe = (event: HammerInput): void => {
    for (const view in this.footprint.views)
      if ('onSwipe' in this.footprint.views[view] && this.footprint.views[view].checkPoint(event.center)) {
        (this.footprint.views[view] as any).onSwipe(event);
      }
  };




  eventToPoint(event: MouseEvent | TouchEvent | WheelEvent | HammerInput): Point {
    const canvas: HTMLCanvasElement = this.footprint.canvasRef?.nativeElement;
    const rect = canvas.getBoundingClientRect();

    let s = window.devicePixelRatio;
    let x: number = 0, y: number = 0;
    if (event instanceof MouseEvent) {
      x = (event.clientX  - rect.left)  * s;
      y = (event.clientY   - rect.top) * s;
      return { x: x , y: y };
    } else if (event instanceof TouchEvent) {
      x = (event.touches[0].clientX - rect.left) *s;
      y = (event.touches[0].clientY - rect.top) *s;
      return { x: x , y: y };
    }

    if (event.center)
        return {x:  s*(event.center - rect.left), y : s*(event.center - rect.top)};

    if (event.x && event.y)    
      return {x: (event.x - rect.left)*s, y:(event.y- rect.top)*s};

    return {x,y};
      
  }

  onMouseMove = (event: MouseEvent): void => {

    
    const point = this.eventToPoint(event);

    if (event.buttons === 1) {
      if (this.footprint.dragMode === null) {
        this.updateHover(point);
      }
      this.onMouseMovePressed(point);
      return;
    }

    const canvas: HTMLCanvasElement | null = this.footprint.canvasRef?.nativeElement;
    if (canvas == null) return;
    if (this.footprint.dragMode !== null) return;

    canvas.style.cursor = 'default';

    if (this.footprint.viewsManager.viewMain != null && !this.footprint.viewsManager.viewMain.checkPoint(point)) {
      this.onMouseOut();
    }

    for (let v = 0; v < this.footprint.views.length; v++) {
      if (this.footprint.views[v].checkDraggable(point)) {
        const part = this.footprint.views[v].draggable;
        canvas.style.cursor = (part === DraggableEnum.Left || part === DraggableEnum.Right) ? 'w-resize' : 's-resize';
        return;
      }
    }

    this.updateHover(point);

    for (const view in this.footprint.views)
      if ('onMouseMove' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point)) {
        this.selectedPoint = point;
        this.onMouseOut();
        (this.footprint.views[view] as any).onMouseMove({ position: point, screen: {x:event.pageX,y:event.pageY},  button: event.button });
      }
  };

  onMouseMovePressed(point: Point) {
    this.footprint.hideHint();

    if (this.footprint.dragMode != null) {
      const resizable = this.footprint.viewsManager.resizeable[this.footprint.dragMode];
      const part = resizable?.draggable;

      const Delta = (part === DraggableEnum.Left || part === DraggableEnum.Right)
        ? point.x - this.pressd.x
        : this.pressd.y - point.y;

      if (resizable instanceof viewIndicatorPanel) {
        const panelId = resizable.panelId;
        if (this.dragIndicatorPanelId !== panelId) {
          this.dragIndicatorPanelId = panelId;
          this.dragIndicatorStartHeight =
            this.footprint.FPsettings.IndicatorPanels?.[panelId]?.height ??
            Math.max(30, Math.floor(resizable.view?.h ?? 90));
        }

        const startH = this.dragIndicatorStartHeight ?? Math.max(30, Math.floor(resizable.view?.h ?? 90));
        const nextH = Math.max(30, Math.floor(startH + Delta));

        const settings = this.footprint.FPsettings;
        const panels = { ...(settings.IndicatorPanels ?? {}) };
        panels[panelId] = { ...(panels[panelId] ?? {}), height: nextH };
        this.footprint.FPsettings = { ...settings, IndicatorPanels: panels };

        this.footprint.translateMatrix = null;
        this.footprint.viewsManager.drawClusterView();
        return;
      }

      const dragKey = VolumeHeightKeyOrder[this.footprint.dragMode];
      if (dragKey) {
        const defaults = getVolumeHeightDefaults(!!this.footprint.FPsettings.CandlesOnly);
        const volumesHeight = normalizeVolumeHeights(
          this.footprint.FPsettings.VolumesHeight,
          defaults
        );
        if (volumesHeight[dragKey] + Delta > 10) {
          this.footprint.updateDeltaVolume(this.footprint.dragMode, Delta);
        }
      }

      this.footprint.translateMatrix = null;
      this.footprint.viewsManager.drawClusterView();
      return;
    }

    for (const view in this.footprint.views)
      if ('onMouseMovePressed' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point)) {
        this.footprint.movedView = this.footprint.views[view];
        (this.footprint.views[view] as any).onMouseMovePressed(point);
      }
  }

  onMouseWheel = (event: WheelEvent): void => {
    const point = this.eventToPoint(event);

    for (const view in this.footprint.views)
    {
      const ev1: MyMouseEvent = {position:point,screen:{x:event.pageX,y:event.pageY}, button: 3 };
      if ('onMouseWheel' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point))
        (this.footprint.views[view] as any).onMouseWheel( ev1, -event.deltaY / 100.0);
        }
    event.preventDefault();
    event.stopPropagation();
  };

  onMouseDown = (event: MouseEvent): void => {
    this.footprint.hideHint();
    const point = this.eventToPoint(event);
    this.pressd = point;
    for (const view in this.footprint.views)
      if (this.footprint.views[view].checkDraggable(point)) {
        for (let x = 0; x < this.footprint.viewsManager.resizeable.length; x++)
          if (this.footprint.views[view] === this.footprint.viewsManager.resizeable[x])
            this.footprint.dragMode = x;

        const dragged = this.footprint.views[view];
        if (dragged instanceof viewIndicatorPanel) {
          this.dragIndicatorPanelId = dragged.panelId;
          this.dragIndicatorStartHeight =
            this.footprint.FPsettings.IndicatorPanels?.[dragged.panelId]?.height ??
            Math.max(30, Math.floor(dragged.view?.h ?? 90));
        } else {
          this.dragIndicatorPanelId = null;
          this.dragIndicatorStartHeight = null;
        }
        return;
      }
    for (const view in this.footprint.views)
      if ('onMouseDown' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point))
        (this.footprint.views[view] as any).onMouseDown(point);
  };

  onTap = (event: MouseEvent): void => {
    //alert('tap');
    const point = this.eventToPoint(event);
    for (const view in this.footprint.views)
      if ('onTap' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point))
        (this.footprint.views[view] as any).onTap(point);
  };

  onRightClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    const point = this.eventToPoint(event);

    for (const view in this.footprint.views)
      if ('onRightClick' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point))
        (this.footprint.views[view] as any).onRightClick(point);
  };

  onDoubleClick = (event: MouseEvent): void => {
    const point = this.eventToPoint(event);

    for (const view in this.footprint.views)
      if ('onDoubleClick' in this.footprint.views[view] && this.footprint.views[view].checkPoint(point))
        (this.footprint.views[view] as any).onDoubleClick(point);
  };



}



