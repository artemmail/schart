import { canvasPart } from './canvas-part';
import { Matrix } from '../models/matrix';
import { Rectangle } from '../models/matrix';
import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { Point } from '../models/matrix';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';

export class viewAnim extends canvasPart {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.No);
  }

  draw(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix): void {
    const ctx = this.parent.ctx;
    const state = this.parent.animButtonState;
    const hoverT = state.hoverT;
    const pressT = state.pressT;

    const baseSize = Math.max(12, Math.round(Math.min(view.h, view.w) * 0.6));
    const scale = 1 + 0.06 * hoverT - 0.08 * pressT;
    const iconSize = Math.max(10, Math.round(baseSize * scale));
    const x = view.x + (view.w - baseSize) / 4 + baseSize / 2;
    const y = view.y + view.h / 2 + pressT * 0.8;

    const bgAlpha = 0.06 * hoverT + 0.12 * pressT;
    if (bgAlpha > 0.001) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.25, bgAlpha);
      ctx.fillStyle = this.palette.text;
      ctx.beginPath();
      ctx.arc(x, y, iconSize * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.65 + 0.25 * hoverT + 0.15 * pressT);
    ctx.fillStyle = this.palette.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${iconSize}px "Material Icons"`;
    ctx.fillText('replay', x, y);
    ctx.restore();
  }

  onMouseEnter() {
    this.setHover(true);
  }

  onMouseLeave() {
    this.setHover(false);
    this.setPressed(false);
  }

  onMouseMove(_: MyMouseEvent) {
    const canvas = this.parent.canvas;
    if (canvas) canvas.style.cursor = 'pointer';
  }

  onMouseDown(_: Point) {
    this.setHover(true);
    this.setPressed(true);
  }

  onMouseUp(_: Point) {
    this.setPressed(false);
  }

  onTap(e: Point) {
    this.setPressed(false);
    this.animation();
  }

  private setHover(value: boolean): void {
    const state = this.parent.animButtonState;
    if (state.hover === value) return;
    state.hover = value;
    this.runAnimation();
  }

  private setPressed(value: boolean): void {
    const state = this.parent.animButtonState;
    if (state.pressed === value) return;
    state.pressed = value;
    this.runAnimation();
  }

  private runAnimation(): void {
    const state = this.parent.animButtonState;
    if (state.rafId) return;

    const step = () => {
      const hoverTarget = state.hover ? 1 : 0;
      const pressTarget = state.pressed ? 1 : 0;

      state.hoverT = this.approach(state.hoverT, hoverTarget, 0.2);
      state.pressT = this.approach(state.pressT, pressTarget, 0.25);

      const done =
        Math.abs(state.hoverT - hoverTarget) < 0.01 &&
        Math.abs(state.pressT - pressTarget) < 0.01;

      this.parent.drawClusterView();

      if (done) {
        state.hoverT = hoverTarget;
        state.pressT = pressTarget;
        state.rafId = 0;
        return;
      }

      state.rafId = requestAnimationFrame(step);
    };

    state.rafId = requestAnimationFrame(step);
  }

  private approach(value: number, target: number, speed: number): number {
    return value + (target - value) * speed;
  }

  private animation(): void {
    const c = this.parent.viewsManager.mtx.clone();
    const init = this.parent.getInitMatrix(this.parent.viewsManager.clusterView, this.parent.data);
    const me = this.parent.viewsManager;
    const stime = Date.now();

    const myTimer = setInterval(() => {
      let t = (Date.now() - stime) / 800;
      t = Math.min(t, 1);
      me.mtx = c.interpolateAnim(init, t);
      me.drawClusterView();
      if (t === 1) clearInterval(myTimer);
    }, 25);
  }
}




