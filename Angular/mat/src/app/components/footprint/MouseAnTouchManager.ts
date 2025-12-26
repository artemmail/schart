import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from './footprint.component';
import { Point } from './matrix';
import * as Hammer from 'hammerjs';
import HammerManager = Hammer.HammerManager;
import HammerInput = Hammer.HammerInput;
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';

export class MouseAndTouchManager {
  footprint: FootPrintComponent;
  panStartInfo: { event: any; view: any } | any;
  selectedPoint: any;
  pressd: Point = { x: 0, y: 0 };
  private hammer: HammerManager;

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

  onMouseOut = (): void => {
    this.footprint.viewsManager.drawClusterView();
    this.footprint.hideHint();
  };

  onMouseUp = (): void => {
    const FPsettings = this.footprint.FPsettings;
    if (this.footprint.dragMode != null) {
      const dragModeIndex = this.footprint.dragMode;
      FPsettings.VolumesHeight[dragModeIndex] +=
        this.footprint.consumeDeltaVolume(dragModeIndex);
      this.footprint.dragMode = null;
      return;
    }

    if (this.footprint.movedView !== null) {
      (this.footprint.movedView as any).onMouseUp();
      this.footprint.viewsManager.drawClusterView();
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
      const part = this.footprint.viewsManager.resizeable[this.footprint.dragMode]?.draggable;

      const Delta = (part === DraggableEnum.Left || part === DraggableEnum.Right)
        ? point.x - this.pressd.x
        : this.pressd.y - point.y;

      if (this.footprint.FPsettings.VolumesHeight[this.footprint.dragMode] + Delta > 10)
        this.footprint.updateDeltaVolume(this.footprint.dragMode, Delta);

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
