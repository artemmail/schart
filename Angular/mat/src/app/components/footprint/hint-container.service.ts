import { Injectable } from '@angular/core';

@Injectable()
export class HintContainerService {
  private hintElement: HTMLDivElement | null = null;

  show(content: string, position: { x: number; y: number }): void {
    const hint = this.ensureHintElement();

    hint.innerHTML = content;
    hint.style.overflow = 'visible';
    hint.style.display = 'block';
    hint.style.left = `${position.x}px`;
    hint.style.top = `${position.y}px`;
  }

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
