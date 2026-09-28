export interface FootprintRenderFlags {
  draw?: boolean;
  resize?: boolean;
  initialize?: boolean;
  recalculate?: boolean;
  realtime?: boolean;
}

/** One frame owner for painting, layout invalidation and chart animations. */
export class FootprintRenderScheduler {
  private frame: number | null = null;
  private flags: FootprintRenderFlags = {};
  private animations = new Set<(time: number) => boolean>();
  private destroyed = false;
  private flushing = false;
  private generation = 0;

  constructor(
    private render: (flags: FootprintRenderFlags) => void,
    private requestFrame: (callback: FrameRequestCallback) => number = callback => requestAnimationFrame(callback),
    private cancelFrame: (id: number) => void = id => cancelAnimationFrame(id),
  ) {}

  request(flags: FootprintRenderFlags = { draw: true }): void {
    if (this.destroyed) return;
    for (const key of Object.keys(flags) as Array<keyof FootprintRenderFlags>) {
      if (flags[key]) this.flags[key] = true;
    }
    this.schedule();
  }

  animate(step: (time: number) => boolean): () => void {
    if (this.destroyed) return () => undefined;
    this.animations.add(step);
    this.schedule();
    return () => {
      this.animations.delete(step);
      if (!this.animations.size && !Object.keys(this.flags).length && this.frame !== null) {
        this.generation++;
        this.cancelFrame(this.frame);
        this.frame = null;
      }
    };
  }

  reset(): void {
    this.generation++;
    if (this.frame !== null) this.cancelFrame(this.frame);
    this.frame = null;
    this.flags = {};
    this.animations.clear();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.reset();
  }

  private schedule(): void {
    if (this.destroyed || this.flushing || this.frame !== null) return;
    const generation = this.generation;
    this.frame = this.requestFrame(time => { if (generation === this.generation) this.flush(time); });
  }

  private flush(time: number): void {
    this.frame = null;
    if (this.destroyed) return;
    this.flushing = true;
    try {
      for (const step of Array.from(this.animations)) {
        if (this.destroyed) break;
        if (!this.animations.has(step)) continue;
        if (!step(time)) this.animations.delete(step);
        this.flags.draw = true;
      }
      const flags = this.flags;
      this.flags = {};
      if (!this.destroyed && Object.keys(flags).length) this.render(flags);
    } finally {
      this.flushing = false;
      if (!this.destroyed && (this.animations.size || Object.keys(this.flags).length)) this.schedule();
    }
  }
}
