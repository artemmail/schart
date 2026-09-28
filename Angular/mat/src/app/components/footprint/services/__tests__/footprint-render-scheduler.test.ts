import { describe, expect, it, jest } from '@jest/globals';
import { FootprintRenderScheduler } from '../footprint-render-scheduler';
import { reconcileCanvasParts } from '../../views/reconcile-canvas-parts';

function fixture() {
  const pending = new Map<number, FrameRequestCallback>();
  let id = 0;
  const request = jest.fn((callback: FrameRequestCallback) => { pending.set(++id, callback); return id; });
  const cancel = jest.fn((key: number) => { pending.delete(key); });
  const render = jest.fn((_flags: any) => undefined);
  const scheduler = new FootprintRenderScheduler(render, request, cancel);
  const tick = (time = 16) => {
    const batch = Array.from(pending.values()); pending.clear();
    for (const callback of batch) callback(time);
  };
  return { scheduler, pending, request, cancel, render, tick };
}

describe('Footprint frame ownership', () => {
  it('coalesces draw, resize, initialization, realtime and recalculation in one frame', () => {
    const f = fixture();
    f.scheduler.request({ draw: true }); f.scheduler.request({ resize: true });
    f.scheduler.request({ realtime: true }); f.scheduler.request({ initialize: true });
    f.scheduler.request({ recalculate: true }); f.scheduler.request({ resize: false });
    expect(f.request).toHaveBeenCalledTimes(1); expect(f.render).not.toHaveBeenCalled();
    f.tick();
    expect(f.render).toHaveBeenCalledTimes(1);
    expect(f.render).toHaveBeenCalledWith({ draw: true, resize: true, realtime: true, initialize: true, recalculate: true });
    expect(f.pending.size).toBe(0);
  });

  it('advances multiple animations before one paint and stops at completion', () => {
    const f = fixture(); const order: string[] = []; let ticks = 0;
    f.render.mockImplementation(() => { order.push('paint'); });
    f.scheduler.animate(() => { order.push('swipe'); f.scheduler.request({ realtime: true }); return ++ticks < 2; });
    f.scheduler.animate(() => { order.push('button'); return false; });
    expect(f.pending.size).toBe(1); f.tick();
    expect(order).toEqual(['swipe', 'button', 'paint']); expect(f.pending.size).toBe(1);
    f.tick(32);
    expect(order).toEqual(['swipe', 'button', 'paint', 'swipe', 'paint']);
    expect(f.pending.size).toBe(0);
  });

  it('keeps invalidation requested during paint for the next frame', () => {
    const f = fixture();
    f.render.mockImplementationOnce(() => f.scheduler.request({ recalculate: true }));
    f.scheduler.request(); f.tick(); expect(f.pending.size).toBe(1);
    f.tick(); expect(f.render).toHaveBeenCalledTimes(2); expect(f.pending.size).toBe(0);
  });

  it('cancels an animation without affecting another owner', () => {
    const f = fixture(); const stopped = jest.fn(() => true); const live = jest.fn(() => false);
    const stop = f.scheduler.animate(stopped); f.scheduler.animate(live); stop(); stop();
    f.tick(); expect(stopped).not.toHaveBeenCalled(); expect(live).toHaveBeenCalledTimes(1);
    expect(f.render).toHaveBeenCalledTimes(1);
  });

  it('rejects old frame callbacks after reset while preserving the new frame', () => {
    const f = fixture(); const animation = jest.fn(() => true);
    f.scheduler.animate(animation); const old = Array.from(f.pending.values())[0];
    f.scheduler.reset(); f.scheduler.request({ initialize: true }); old(16);
    expect(f.pending.size).toBe(1); expect(f.render).not.toHaveBeenCalled();
    f.tick(); expect(animation).not.toHaveBeenCalled(); expect(f.render).toHaveBeenCalledTimes(1);
  });

  it('destroy cancels pending draw and animations and refuses new work', () => {
    const f = fixture(); const animation = jest.fn(() => true);
    f.scheduler.animate(animation); f.scheduler.request({ resize: true });
    const late = Array.from(f.pending.values())[0]; f.scheduler.destroy(); f.scheduler.destroy();
    f.scheduler.request(); f.scheduler.animate(animation); late(16); f.tick();
    expect(f.pending.size).toBe(0); expect(f.cancel).toHaveBeenCalledTimes(1);
    expect(animation).not.toHaveBeenCalled(); expect(f.render).not.toHaveBeenCalled();
  });

  it('ignores a cancelled animation frame after a new draw was requested', () => {
    const f = fixture();
    const stop = f.scheduler.animate(() => true);
    const old = Array.from(f.pending.values())[0];
    stop(); f.scheduler.request(); old(16);
    expect(f.render).not.toHaveBeenCalled(); expect(f.pending.size).toBe(1);
    f.tick(); expect(f.render).toHaveBeenCalledTimes(1);
  });
});

class Part {
  view: any = {}; mtx: any = {};
  dispose = jest.fn();
  constructor(public panelId?: string) {}
}
class OtherPart extends Part {}

describe('Canvas parts lifecycle', () => {
  it('preserves interactive owners and refreshes geometry, disposing unused parts', () => {
    const main = new Part(); const removed = new OtherPart();
    const candidate = new Part(); const panel = new Part('panel-1');
    const replacements = reconcileCanvasParts([main, removed], [candidate, panel]);
    expect(replacements.get(candidate)).toBe(main);
    expect(main.view).toBe(candidate.view); expect(main.mtx).toBe(candidate.mtx);
    expect(main.dispose).not.toHaveBeenCalled(); expect(candidate.dispose).toHaveBeenCalledTimes(1);
    expect(removed.dispose).toHaveBeenCalledTimes(1); expect(panel.dispose).not.toHaveBeenCalled();
  });

  it('matches panel identity and never disposes a part retained unchanged', () => {
    const first = new Part('1'); const second = new Part('2'); const replacement = new Part('2');
    const result = reconcileCanvasParts([first, second], [replacement, first]);
    expect(result.get(replacement)).toBe(second); expect(result.get(first)).toBe(first);
    expect(first.dispose).not.toHaveBeenCalled(); expect(second.dispose).not.toHaveBeenCalled();
  });
});
