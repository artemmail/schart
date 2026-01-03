import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ViewContainerRef } from '@angular/core';
import { DialogZIndexService } from 'src/app/service/dialog-zindex.service';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-non-modal-dialog',
  imports: [CommonModule, MaterialModule],
  templateUrl: './non-modal-dialog.component.html',
  styleUrls: ['./non-modal-dialog.component.scss'],
})
export class NonModalDialogComponent {
  @Input() title: string;
  @ViewChild('dialogTemplate') dialogTemplate: TemplateRef<any>;
  @Output() onCloseCallback = new EventEmitter<void>();

  private overlayRef: OverlayRef;
  isDragging = false;

  constructor(
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef
  ) {}

  openDialog(top?: number, left?: number) {
    if (this.overlayRef) this.closeDialog();
    //return;

    const overlayConfig = this.overlay.position().global();

    if (top !== undefined && left !== undefined) {
      overlayConfig.top(`${top}px`).left(`${left}px`);
    }

    this.overlayRef = this.overlay.create({
      hasBackdrop: false,
      positionStrategy: overlayConfig,
    });

    const dialogPortal = new TemplatePortal(
      this.dialogTemplate,
      this.viewContainerRef
    );

    this.overlayRef.attach(dialogPortal);

    setTimeout(() => {
      const dialogElement = this.overlayRef.overlayElement.querySelector(
        '.non-modal-dialog'
      ) as HTMLElement;

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const dialogRect = dialogElement.getBoundingClientRect();
      const dialogWidth = dialogRect.width;
      const dialogHeight = dialogRect.height;

      const centeredTop = (windowHeight - dialogHeight) / 2;
      const centeredLeft = (windowWidth - dialogWidth) / 2;

      overlayConfig.top(`${centeredTop}px`).left(`${centeredLeft}px`);
      this.overlayRef.updatePosition();
    });
  }

  closeDialog() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.onCloseCallback.emit();
    }
  }

  onDragStart() {
    this.isDragging = true;
  }

  onDragEnd() {
    this.isDragging = false;
  }
}
