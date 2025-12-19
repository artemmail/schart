import { Directive, HostListener, ElementRef } from '@angular/core';
import { FootPrintComponent } from './footprint/footprint.component';

@Directive({
  selector: '[appResizeListener]',
})
export class ResizeListenerDirective {
  //  constructor(private host:MyComponent) {}

  constructor(private el: FootPrintComponent) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    //   const canvasElement: HTMLCanvasElement = this.myCanvas.nativeElement;
    // alert( JSON.stringify(  event));

    var canvas = this.el.canvasRef?.nativeElement;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = Math.max(
      220,
      window.innerHeight - canvas.getBoundingClientRect().top
    );
    canvas.style.height = canvas.height + 'px';
    canvas.style.width = canvas.width + 'px';
    this.el.resize();
  }

  draw() {}
}
