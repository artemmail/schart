import type { InteractionContext } from '../models/footprint-context';
import { Point } from '../models/matrix';
import { DEFAULT_MARKUP_COLOR, MarkupDefinition, MarkupParamSchema } from './markup-api';
import { MarkupRegistry } from './markup-registry';
import { ProfileAuto } from './profile-auto';
import { Shape, ShapePoint } from './shape';

const EDIT_TOOL = 'Edit';

export class MarkUpManager {
  private disposed = false;
  selectedShape: ShapePoint | null;
  mouseShape: ShapePoint | null;
  footprint: InteractionContext;
  shapeArray: Array<Shape>;
  drawingShape: Shape | null;
  private profileAuto: ProfileAuto;

  private toolParams = new Map<string, Record<string, any>>();
  private activeTool: string = EDIT_TOOL;
  private activeDefinitionRef: MarkupDefinition<any> | null = null;
  private activeParamsRef: Record<string, any> | null = null;

  readonly defaultSelectionColor = DEFAULT_MARKUP_COLOR;

  cancelInteraction(): void {
    this.selectedShape = null;
    this.mouseShape = null;
    this.drawingShape = null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelInteraction();
    this.shapeArray = [];
    this.toolParams.clear();
    this.activeDefinitionRef = null;
    this.activeParamsRef = null;
  }

  constructor(private registry: MarkupRegistry, footprint: InteractionContext) {
    this.selectedShape = null;
    this.mouseShape = null;
    this.footprint = footprint;
    this.shapeArray = [];
    this.drawingShape = null;

    this.ensureDefaults();
    this.profileAuto = new ProfileAuto(this, this.getToolParams('Profile'));
    this.activateTool(EDIT_TOOL);
  }

  listDefinitions(): MarkupDefinition<any>[] {
    return this.registry.list();
  }

  listToolbarDefinitions(): MarkupDefinition<any>[] {
    return this.registry.list().filter((def) => !def.hidden);
  }

  get activeToolType(): string {
    return this.activeTool;
  }

  get activeDefinition(): MarkupDefinition<any> | null {
    return this.activeDefinitionRef;
  }

  get activeParams(): Record<string, any> | null {
    return this.activeParamsRef;
  }

  hasSelection(): boolean {
    return !!this.selectedShape;
  }

  getToolParams(type: string): Record<string, any> {
    return this.ensureToolParams(type);
  }

  onParamsChanged(syncDefaults: boolean = true): void {
    if (this.disposed) return;
    if (!this.activeParamsRef) {
      return;
    }

    if (this.selectedShape && syncDefaults) {
      this.updateToolParams(this.selectedShape.shape.type, this.activeParamsRef, 'instance');
    }

    this.footprint.requestRender();
  }

  selectShape(point: Point): ShapePoint | null {
    for (let shape of this.shapeArray) {
      const p = shape.selectedPoint(point);
      if (p != null) return p;
    }
    return null;
  }

  updateShapeFromModel(): void {
    // Backward compatibility for older callers; params are bound directly now.
    this.onParamsChanged();
  }

  deleteCurrent(): void {
    if (this.disposed) return;
    if (this.selectedShape) {
      this.shapeArray.splice(this.shapeArray.indexOf(this.selectedShape.shape), 1);
      this.selectedShape = null;
      this.activateTool(EDIT_TOOL);
      this.footprint.requestRender();
    }
  }

  clearAll(shouldRedraw: boolean = true): void {
    if (this.disposed) return;
    this.shapeArray = [];
    this.selectedShape = null;
    this.mouseShape = null;
    this.drawingShape = null;
    this.activateTool(EDIT_TOOL);
    if (shouldRedraw) {
      this.footprint.requestRender();
    }
  }

  onMouseDown(point: Point): void {
    if (this.disposed) return;
    if (this.drawingShape != null && !this.drawingShape.isComplete()) {
      if (this.drawingShape.supportsMultiPointDraw()) {
        this.drawingShape.onStartNextPoint(point);
        return;
      }
    }

    this.selectedShape = this.mouseShape;
    if (this.selectedShape != null) {
      this.activateSelection(this.selectedShape.shape);
      this.selectedShape.shape.onStartMovePoint(point);
    } else {
      if (this.activeTool === EDIT_TOOL) {
        this.activateTool(EDIT_TOOL);
        return;
      }
      if (this.activeTool === 'Profile') {
        const params = this.getToolParams('Profile');
        if (params?.profilePeriod !== undefined && params.profilePeriod !== -1) {
          return;
        }
      }

      this.drawingShape = this.shapeFactory(this.activeTool);
      if (this.drawingShape != null) this.drawingShape.onStartDraw(point);
    }
  }

  onMouseDownMove(point: Point): void {
    if (this.disposed) return;
    if (this.selectedShape != null) {
      this.selectedShape.shape.onMovePoint(point);
      this.footprint.requestRender();
    }
    if (this.drawingShape != null) {
      this.drawingShape.onMouseDownMove(point);
      this.footprint.requestRender();
    }
  }

  onMouseMove(point: Point): void {
    if (this.disposed) return;
    if (this.drawingShape != null && !this.drawingShape.isComplete()) {
      if (this.drawingShape.supportsMultiPointDraw()) {
        this.drawingShape.onMouseMove(point);
        this.footprint.requestRender();
      }
    }
    this.mouseShape = this.selectShape(point);
    this.footprint.setCursor(this.resolveCursor(this.mouseShape));
  }

  onMouseUp(point: Point): void {
    if (this.disposed) return;
    if (this.drawingShape != null) {
      if (!this.drawingShape.isComplete()) {
        this.drawingShape.onMouseUp(point);
      } else {
        if (this.drawingShape.sortPoints()) {
          this.shapeArray.push(this.drawingShape);
          this.drawingShape.onMouseUp(point);
        }
        this.drawingShape = null;
      }
    }
    if (this.selectedShape != null) {
      this.selectedShape.shape.onMouseUp(point);
    }
  }

  changeMode(mode: string): void {
    if (this.disposed) return;
    if (mode === this.activeTool && mode === EDIT_TOOL) return;
    this.activateTool(mode);
    this.footprint.requestRender();
  }

  allowPan(): boolean {
    return this.selectedShape == null && this.drawingShape == null;
  }

  drawAll(): void {
    if (this.disposed) return;
    this.profileAuto.drawShape();
    for (let shape of this.shapeArray) {
      shape.drawShape();
      if (
        (this.mouseShape != null && this.mouseShape.shape == shape) ||
        (this.selectedShape != null && this.selectedShape.shape == shape)
      )
        shape.drawSelection();
    }
    if (this.drawingShape != null) this.drawingShape.drawShape();
  }

  private activateTool(type: string): void {
    const def = this.registry.get(type);
    if (type !== EDIT_TOOL && !def) {
      return;
    }

    this.activeTool = type;
    this.selectedShape = null;
    this.mouseShape = null;
    this.drawingShape = null;

    if (type === EDIT_TOOL) {
      this.activeDefinitionRef = null;
      this.activeParamsRef = null;
      return;
    }

    this.activeDefinitionRef = def ?? null;
    this.activeParamsRef = this.ensureToolParams(type);
  }

  private activateSelection(shape: Shape): void {
    this.activeTool = EDIT_TOOL;
    this.activeDefinitionRef = this.registry.get(shape.type) ?? null;
    this.activeParamsRef = shape.params;
    this.updateToolParams(shape.type, shape.params, 'instance');
  }

  private shapeFactory(type: string): Shape | null {
    const def = this.registry.get(type);
    if (!def?.create) return null;

    const params = this.cloneParams(this.ensureToolParams(type));
    return def.create(this, params);
  }

  private resolveCursor(shapePoint: ShapePoint | null): string {
    if (shapePoint == null) return 'default';
    return shapePoint.point != null ? 'pointer' : 'move';
  }

  private ensureDefaults(): void {
    for (const def of this.registry.list()) {
      if (!this.toolParams.has(def.type)) {
        this.toolParams.set(def.type, this.buildDefaults(def.paramsSchema));
      }
    }
  }

  private ensureToolParams(type: string): Record<string, any> {
    if (!this.toolParams.has(type)) {
      const def = this.registry.get(type);
      this.toolParams.set(type, this.buildDefaults(def?.paramsSchema));
    }
    return this.toolParams.get(type) ?? {};
  }

  private buildDefaults(schema?: MarkupParamSchema<any>): Record<string, any> {
    const out: Record<string, any> = {};
    if (!schema) return out;
    for (const key of Object.keys(schema)) {
      out[key] = schema[key].default;
    }
    return out;
  }

  private updateToolParams(
    type: string,
    params: Record<string, any>,
    scope: 'instance' | 'all' = 'all'
  ): void {
    const target = this.ensureToolParams(type);
    const keys =
      scope === 'all'
        ? Object.keys(params)
        : this.getInstanceScopedKeys(this.registry.get(type));

    for (const key of keys) {
      if (params && key in params) {
        target[key] = params[key];
      }
    }
  }

  private getInstanceScopedKeys(def?: MarkupDefinition<any>): string[] {
    const schema = def?.paramsSchema;
    if (!schema) return [];
    return Object.keys(schema).filter((key) => schema[key]?.scope !== 'tool');
  }

  private cloneParams<T extends Record<string, any>>(params: T): T {
    if (!params) return {} as T;
    try {
      return JSON.parse(JSON.stringify(params)) as T;
    } catch (e) {
      return { ...params } as T;
    }
  }
}
