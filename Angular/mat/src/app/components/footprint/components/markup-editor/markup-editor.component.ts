import { Component, Input, HostListener } from '@angular/core';
import type { FootprintController } from '../../models/footprint-controller';
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
  @Input() NP: FootprintController;

  constructor() {}

  get toolbarDefinitions() {
    return this.NP?.markupDefinitions ?? [];
  }

  get activeTool(): MarkupMode {
    return this.NP?.markupState.activeTool ?? 'Edit';
  }

  get activeDefinition() {
    return this.NP?.markupState.definition ?? null;
  }

  get activeParams() {
    return this.NP?.markupState.params ?? null;
  }

  get activeToolParams() {
    const type = this.activeDefinition?.type;
    if (!type) return null;
    return this.NP?.getMarkupParams(type) ?? null;
  }

  get canDelete(): boolean {
    return this.NP?.markupState.canDelete ?? false;
  }

  getFieldTarget(field: any) {
    if (field?.scope === 'tool') {
      return this.activeToolParams ?? this.activeParams;
    }
    return this.activeParams ?? this.activeToolParams;
  }

  onToolChange(event: MarkupMode) {
    this.NP?.selectMarkupTool(event);
  }

  onDelete(event: any) {
    this.NP?.deleteMarkup();
  }

  onParamsChanged(field?: any) {
    this.NP?.changeMarkupParams(this.getFieldTarget(field), field?.scope === 'tool' ? 'tool' : 'instance');
  }

  @HostListener('document:keydown.delete', ['$event'])
  handleDeleteKey(event: KeyboardEvent) {
    if (this.canDelete) {
      this.onDelete(event);
    }
  }
}


