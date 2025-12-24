export {};

declare global {
  interface CanvasRenderingContext2D {
    setMatrix(mtx: any): void;
    mStorkeRect(x1: number, y1: number, x2: number, y2: number): void;
    mFillRect(x1: number, y1: number, x2: number, y2: number): void;
    mFillRectangle(x1: number, y1: number, w: number, h: number): void;

    ArrowHead(x1: number, y1: number, x2: number, y2: number, h: number, w: number): void;

    myStrokeRect(r: { x: number; y: number; w: number; h: number }): void;
    myFillRect(r: { x: number; y: number; w: number; h: number }): void;
    myFillRectSmoothX(r: { x: number; y: number; w: number; h: number }): void;
    myStrokeRectXY(p1: { x: number; y: number }, p2: { x: number; y: number }): void;
    myFillRectXY(p1: { x: number; y: number }, p2: { x: number; y: number }): void;
    myRectXY(p1: { x: number; y: number }, p2: { x: number; y: number }): void;
    myMoveTo(x: number, y: number): void;
    myLineTo(x: number, y: number): void;
    myLine(x1: number, y1: number, x2: number, y2: number): void;
    myFillRectSmooth(r: { x: number; y: number; w: number; h: number }): void;
    myRect(r: { x: number; y: number; w: number; h: number }): void;
  }
}

