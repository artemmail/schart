export const Injectable = () => (target: any) => target;
export const Component = (_meta?: any) => (target: any) => target;
export const ViewChild = (_selector?: any, _opts?: any) => (_target: any, _key: any) => {};
export const Input = () => (_target: any, _key: any) => {};
export const HostListener = (_eventName?: any) => (_target: any, _key: any) => {};
export class ElementRef<T = any> {
  constructor(public nativeElement: T) {}
}
export class DestroyRef {
  onDestroy(_fn?: () => void) {}
}
export class SimpleChanges {}
export class SimpleChange {}
export class OnDestroy {}
export class AfterViewInit {}
export class OnChanges {}
export class AfterContentInit {}
export class OnInit {}
export class PipeTransform {}
export const Pipe = (_meta?: any) => (target: any) => target;
