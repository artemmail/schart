import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DialogZIndexService {
  private currentZIndex = 1000;

  getNextZIndex(): number {
    return ++this.currentZIndex;
  }

  setZIndexToMax(element: HTMLElement): void {
    element.style.zIndex = this.getNextZIndex().toString();
  }
}