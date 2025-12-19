import { Point } from './Point';

export interface MyMouseEvent {
    position: Point;
    screen: Point;
    button: number;
}