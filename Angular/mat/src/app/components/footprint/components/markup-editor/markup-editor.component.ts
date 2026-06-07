import { Component, Input, HostListener } from '@angular/core';
import { FootPrintComponent } from '../footprint/footprint.component';
import { MarkupMode } from '../../markup/shape-type';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-markup-editor',
  imports: [MaterialModule],
  templateUrl: './markup-editor.component.html',
  styleUrls: ['./markup-editor.component.css'],
})
export class MarkupEditorComponent {
  @Input() NP: FootPrintComponent;

  constructor() {}

  get toolbarDefinitions() {
    return this.NP?.markupManager?.listToolbarDefinitions?.() ?? [];
  }

  get activeTool(): MarkupMode {
    return this.NP?.markupManager?.activeToolType ?? 'Edit';
  }

  get activeDefinition() {
    return this.NP?.markupManager?.activeDefinition ?? null;
  }

  get activeParams() {
    return this.NP?.markupManager?.activeParams ?? null;
  }

  get activeToolParams() {
    const type = this.activeDefinition?.type;
    if (!type) return null;
    return this.NP?.markupManager?.getToolParams?.(type) ?? null;
  }

  get canDelete(): boolean {
    return this.NP?.markupManager?.hasSelection?.() ?? false;
  }

  getFieldTarget(field: any) {
    if (field?.scope === 'tool') {
      return this.activeToolParams ?? this.activeParams;
    }
    return this.activeParams ?? this.activeToolParams;
  }

  onToolChange(event: MarkupMode) {
    this.NP?.markupManager?.changeMode(event);
  }

  onDelete(event: any) {
    this.NP?.markupManager?.deleteCurrent();
  }

  onParamsChanged(field?: any) {
    const syncDefaults = field?.scope !== 'tool';
    this.NP?.markupManager?.onParamsChanged?.(syncDefaults);
  }

  @HostListener('document:keydown.delete', ['$event'])
  handleDeleteKey(event: KeyboardEvent) {
    if (this.canDelete) {
      this.onDelete(event);
    }
  }
}


