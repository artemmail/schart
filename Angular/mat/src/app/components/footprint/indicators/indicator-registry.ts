import { IndicatorDefinition } from './indicator-api';

export class IndicatorRegistry {
  private defs = new Map<string, IndicatorDefinition<any>>();

  register<P extends object>(def: IndicatorDefinition<P>): void {
    if (!def?.type) {
      throw new Error('IndicatorDefinition.type is required');
    }
    if (this.defs.has(def.type)) {
      throw new Error(`Indicator "${def.type}" already registered`);
    }
    this.defs.set(def.type, def);
  }

  get(type: string): IndicatorDefinition<any> | undefined {
    return this.defs.get(type);
  }

  list(): IndicatorDefinition<any>[] {
    return [...this.defs.values()];
  }
}

