import { MarkupDefinition } from './markup-api';

export class MarkupRegistry {
  private defs = new Map<string, MarkupDefinition<any>>();

  register<P extends object>(def: MarkupDefinition<P>): void {
    if (!def?.type) {
      throw new Error('MarkupDefinition.type is required');
    }
    if (this.defs.has(def.type)) {
      throw new Error(`Markup "${def.type}" already registered`);
    }
    this.defs.set(def.type, def);
  }

  get(type: string): MarkupDefinition<any> | undefined {
    return this.defs.get(type);
  }

  list(): MarkupDefinition<any>[] {
    return [...this.defs.values()];
  }
}
