import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { TemplatePortal } from '@angular/cdk/portal';
import { ViewContainerRef } from '@angular/core';
import { DialogZIndexService } from 'src/app/service/dialog-zindex.service';
import { MaterialModule } from 'src/app/material.module';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';

@Component({
  standalone: true,
  selector: 'app-non-modal-dialog',
  imports: [CommonModule, MaterialModule, DragDropModule],
  templateUrl: './non-modal-dialog.component.html',
  styleUrls: ['./non-modal-dialog.component.scss'],
})
export class NonModalDialogComponent {
  @Input() title: string;
  @Input() dialogKey?: string;
  @Input() settings?: ChartSettings | null;
  @ViewChild('dialogTemplate') dialogTemplate: TemplateRef<any>;
  @ViewChild('dialogRoot') dialogRoot?: ElementRef<HTMLElement>;
  @Output() onCloseCallback = new EventEmitter<void>();

  private overlayRef: OverlayRef;
  isDragging = false;

  constructor(
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef,
    private chartSettingsService: ChartSettingsService
  ) {}

  openDialog(top?: number, left?: number) {
    if (this.overlayRef) this.closeDialog();
    //return;

    const overlayConfig = this.overlay.position().global();
    const savedPosition = this.getSavedPosition();

    if (top !== undefined && left !== undefined) {
      overlayConfig.top(`${top}px`).left(`${left}px`);
    } else if (savedPosition) {
      overlayConfig.top(`${savedPosition.y}px`).left(`${savedPosition.x}px`);
    } else {
      overlayConfig.centerHorizontally().centerVertically();
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

  onDragEnd(_event: CdkDragEnd) {
    this.isDragging = false;
    if (!this.dialogKey || !this.settings || !this.dialogRoot) {
      return;
    }

    requestAnimationFrame(() => {
      const rect = this.dialogRoot?.nativeElement.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const position = {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
      };

      const current = this.settings?.DialogPositions?.[this.dialogKey];
      if (current && current.x === position.x && current.y === position.y) {
        return;
      }

      if (!this.settings.DialogPositions) {
        this.settings.DialogPositions = {};
      }

      this.settings.DialogPositions[this.dialogKey] = position;
      this.chartSettingsService.updateSettings(this.settings).subscribe();
    });
  }

  private getSavedPosition(): { x: number; y: number } | null {
    if (!this.dialogKey || !this.settings?.DialogPositions) {
      return null;
    }

    const position = this.settings.DialogPositions[this.dialogKey];
    if (!position) {
      return null;
    }

    const x = Number(position.x);
    const y = Number(position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return { x, y };
  }
}
