import { Injectable } from '@angular/core';

@Injectable()
export class HintContainerService {
  private hintElement: HTMLDivElement | null = null;

  ensureHintElement(): HTMLDivElement {
    if (!this.hintElement) {
      this.hintElement = document.createElement('div');
      this.hintElement.id = 'hint';
      document.body.appendChild(this.hintElement);
    }

    return this.hintElement;
  }

  hide(): void {
    const hint = this.hintElement ?? this.ensureHintElement();
    hint.style.overflow = 'hidden';
    hint.style.display = 'none';
  }
}
