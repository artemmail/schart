import type { MarkUpManager } from './markup-manager';
import type { Shape } from './shape';

export const DEFAULT_MARKUP_COLOR = '#F08080';

export type MarkupParamType = 'int' | 'float' | 'bool' | 'color' | 'enum' | 'text';

export interface MarkupParamField<T> {
  type: MarkupParamType;
  title: string;
  group?: string;
  scope?: 'instance' | 'tool';
  min?: number;
  max?: number;
  step?: number;
  default: T;
  options?: { value: any; label: string }[];
  palette?: string[];
  rows?: number;
  hint?: string;
  hidden?: boolean;
}

export type MarkupParamSchema<P> = { [K in keyof P]: MarkupParamField<P[K]> };

export interface MarkupDefinition<P extends object = any> {
  type: string;
  displayName: string;
  description?: string;
  icon?: string;
  paramsSchema?: MarkupParamSchema<P>;
  create?: (manager: MarkUpManager, params: P) => Shape;
  hidden?: boolean;
}
