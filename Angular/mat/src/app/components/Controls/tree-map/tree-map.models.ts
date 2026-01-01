export type TreeMapType = 'squarified' | 'vertical' | 'horizontal';

export interface TreeMapOptions {
  type: TreeMapType;

  textField: string;      // default: "name"
  valueField: string;     // default: "value"
  colorField: string;     // default: "color"
  childrenField: string;  // default: "items"

  colors: Array<string | [string, string]>;
  colorScale?: TreeMapColorScale;

  /** Размер заголовка контейнеров: px (для horizontal - ширина, иначе - высота) */
  titleSize: number;

  /** Показывать заголовок у корня (псевдо-корень не показывает никогда) */
  showTopLevelTitles: boolean;

  /** Если у контейнера нет value - суммировать детей */
  deriveParentValueFromChildren: boolean;

  /** Округление координат (как в исходнике round to 4) */
  roundDecimals: number;

  /** Не углубляться, если тайл меньше этого размера */
  minTileSize: number;
}

export interface TreeMapColorScale {
  min: string;
  max: string;
  center?: string; // цвет для 0
}

export interface TreeMapTileContext<T = any> {
  $implicit: T;                // dataItem
  node: TreeNode<T>;
  isLeaf: boolean;
}

export interface TreeMapEvent<T = any> {
  node: TreeNode<T>;
  dataItem: T;
  path: T[]; // от top-level до узла
}

export interface Coord {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface TreeNode<T = any> {
  uid: string;
  level: number;
  text: string;
  value: number;
  color?: string;

  coord: Coord;

  dataItem: T | null;        // null только у псевдо-корня
  children?: TreeNode<T>[];

  // для алгоритмов
  area?: number;
  vertical?: boolean;
}

export interface Layout {
  compute(children: TreeNode[], coord: Coord): void;
}
