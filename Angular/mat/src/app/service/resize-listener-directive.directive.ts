import { Directive, HostListener, ElementRef } from '@angular/core';
import { FootPrintComponent } from '../components/footprint/footprint.component';

@Directive({
  selector: '[appResizeListener]',
  standalone: true
})
export class ResizeListenerDirective {
  //  constructor(private host:MyComponent) {}
  constructor(private el: FootPrintComponent) {}
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {

  //  this.el.resize();
  }

  draw() {}
}
