import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription, defer, from, isObservable, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';

type TreeMapType = 'squarified' | 'vertical' | 'horizontal';

export interface TreeMapOptions {
  type: TreeMapType;

  textField: string;      // default: "name"
  valueField: string;     // default: "value"
  colorField: string;     // default: "color"
  childrenField: string;  // default: "items"

  colors: Array<string | [string, string]>;

  /** Размер заголовка контейнеров: px (для horizontal — ширина, иначе — высота) */
  titleSize: number;

  /** Показывать заголовок у корня (псевдо-корень не показывает никогда) */
  showTopLevelTitles: boolean;

  /** Если у контейнера нет value — суммировать детей */
  deriveParentValueFromChildren: boolean;

  /** Округление координат (как в исходнике round to 4) */
  roundDecimals: number;

  /** Не углубляться, если тайл меньше этого размера */
  minTileSize: number;
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

interface Coord {
  width: number;
  height: number;
  top: number;
  left: number;
}

interface TreeNode<T = any> {
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

const MAX_VALUE = Number.MAX_VALUE;
const UNDEFINED = 'undefined';

@Component({
  selector: 'app-treemap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-map.component.html',
  styleUrls: ['./tree-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
  
})
export class TreeMapComponent<T = any> implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  // 1) Прямые данные
  @Input() data: T[] | null = null;

  // 2) Поток данных (обновления пушатся)
  @Input() data$?: Observable<T[]>;

  // 3) Лоадер (компонент сам вызывает). Можно плюс polling.
  @Input() loader?: () => Observable<T[]> | Promise<T[]> | T[];
  @Input() refreshMs: number | null = null; // например 5000. null/0 = без polling

  @Input() options: Partial<TreeMapOptions> = {};

  @Input() tileTemplate?: TemplateRef<TreeMapTileContext<T>>;
  @Input() titleTemplate?: TemplateRef<TreeMapTileContext<T>>;

  @Output() dataBound = new EventEmitter<void>();
  @Output() tileClick = new EventEmitter<TreeMapEvent<T>>();
  @Output() tileHover = new EventEmitter<TreeMapEvent<T>>();

  root: TreeNode<T> | null = null;
  hoveredUid: string | null = null;

  private ro: ResizeObserver | null = null;
  private rebuildQueued = false;

  private uidSeq = 0;
  private colorIdx = 0;

  private sourceSub: Subscription | null = null;

  private get cfg(): TreeMapOptions {
    return {
      type: 'squarified',
      textField: 'name',
      valueField: 'value',
      colorField: 'color',
      childrenField: 'items',
      colors: ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E8684A', '#6DC8EC'],
      titleSize: 26,
      showTopLevelTitles: true,
      deriveParentValueFromChildren: true,
      roundDecimals: 4,
      minTileSize: 2,
      ...this.options
    };
  }


  constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {}


  ngAfterViewInit(): void {
    
    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.queueRebuild());
      this.ro.observe(this.host.nativeElement);
    });

    this.resetDataSource();
    this.rebuild(); // на случай, если data уже есть
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data$'] || changes['loader'] || changes['refreshMs']) {
      this.resetDataSource();
    }
    if (changes['data'] || changes['options']) {
      this.queueRebuild();
    }
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.ro = null;
    this.sourceSub?.unsubscribe();
    this.sourceSub = null;
  }

  // ===== Template helpers =====
  isLeaf(node: TreeNode<T>): boolean {
    return !(node.children && node.children.length);
  }

  isInverse(node: TreeNode<T>): boolean {
    return colorBrightness(node.color) > 180;
  }

  isTitleSide(): boolean {
    return this.cfg.type === 'horizontal';
  }

  trackByUid = (_: number, n: TreeNode<T>) => n.uid;

  titleSizeFor(node: TreeNode<T>): number {
    // Псевдо-корень (level 0, dataItem=null) не имеет заголовка
    if (!node.dataItem) return 0;
    const hasChildren = !!node.children?.length;
    if (!hasChildren) return 0;
    // top-level показываем/скрываем опцией
    if (node.level === 1 && !this.cfg.showTopLevelTitles) return 0;
    return Math.max(0, this.cfg.titleSize);
  }

onTileMouseEnter(node: TreeNode<T>): void {
  if (!node.dataItem) return;
  this.hoveredUid = node.uid;
  this.tileHover.emit({ node, dataItem: node.dataItem, path: this.buildPath(node) });
}

onTileMouseLeave(node: TreeNode<T>): void {
  if (this.hoveredUid === node.uid) this.hoveredUid = null;
}

onTileClick(node: TreeNode<T>): void {
  if (!node.dataItem) return;
  this.tileClick.emit({ node, dataItem: node.dataItem, path: this.buildPath(node) });
}


  /** Можно дергать из родителя: this.treemap.refreshNow() */
  refreshNow(): void {
    // если источник data$ — просто rebuild
    // если loader — принудительно дернем еще раз
    if (this.loader && !this.data$) {
      this.resetDataSource();
      return;
    }
    this.queueRebuild();
  }

  // ===== Data source wiring =====
  private resetDataSource(): void {
    
    this.sourceSub?.unsubscribe();
    this.sourceSub = null;

    // Приоритет: data$ > loader > data
    if (this.data$) {
      this.sourceSub = this.data$.subscribe(arr => {
        this.data = arr ?? [];
        this.queueRebuild();
      });
      return;
    }

    if (this.loader) {
      const oneLoad$ = defer(() => {
        const res = this.loader!();
        if (isObservable(res)) return res;
        if (res instanceof Promise) return from(res);
        return of(res as T[]);
      });

      const poll = this.refreshMs && this.refreshMs > 0;
      const stream$ = poll
        ? timer(0, this.refreshMs!).pipe(switchMap(() => oneLoad$))
        : oneLoad$;

      this.sourceSub = stream$.subscribe(arr => {
 this.data = arr ?? [];
this.cdr.markForCheck();
this.queueRebuild();
      });
    }
  }

  // ===== Layout pipeline =====
  private queueRebuild(): void {
    if (this.rebuildQueued) return;
    this.rebuildQueued = true;

    queueMicrotask(() => {
      this.rebuildQueued = false;
      this.rebuild();
    });
  }

  private rebuild(): void {

    const el = this.host?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    if (width === 0 || height === 0) return;

    this.uidSeq = 0;
    this.colorIdx = 0;

    const root: TreeNode<T> = {
      uid: this.nextUid(),
      level: 0,
      text: '',
      value: 0,
      coord: { width, height, top: 0, left: 0 },
      dataItem: null,
      children: this.buildNodes(this.data ?? [], 1)
    };

    this.sortTree(root);

    if (this.cfg.deriveParentValueFromChildren) {
      this.deriveValues(root);
    }

    this.applyColors(root);

    const layout: Layout =
      this.cfg.type === 'vertical' ? new SliceAndDiceLayout(true) :
      this.cfg.type === 'horizontal' ? new SliceAndDiceLayout(false) :
      new SquarifiedLayout();

    this.layoutNode(root, layout);

    // округление координат (как round в исходнике)
    const d = this.cfg.roundDecimals;
    this.roundCoordsDeep(root, d);

    this.root = root;
this.cdr.markForCheck();   // <-- важно

    this.zone.run(() => this.dataBound.emit());
  }

  private buildNodes(items: T[], level: number): TreeNode<T>[] {
    
    const { textField, valueField, colorField, childrenField } = this.cfg;

    const nodes: TreeNode<T>[] = [];
    for (const item of items ?? []) {
      const rawText = getField(textField, item);
      const rawValue = getField(valueField, item);
      const rawColor = getField(colorField, item);
      const rawChildren = getField(childrenField, item);

      const childrenArr = Array.isArray(rawChildren) ? (rawChildren as T[]) : [];

      const node: TreeNode<T> = {
        uid: this.nextUid(),
        level,
        text: (rawText ?? '') + '',
        value: toNumber(rawValue),
        color: typeof rawColor === 'string' ? rawColor : undefined,
        coord: { width: 0, height: 0, top: 0, left: 0 },
        dataItem: item,
        children: childrenArr.length ? this.buildNodes(childrenArr, level + 1) : undefined
      };

      // как в оригинале: тайлы с value=0 скрывались
      if (Number.isFinite(node.value) && node.value === 0) continue;

      nodes.push(node);
    }

    return nodes;
  }

  private sortTree(node: TreeNode<T>): void {
    if (!node.children?.length) return;
    node.children.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    for (const c of node.children) this.sortTree(c);
  }

  private deriveValues(node: TreeNode<T>): number {
    if (!node.children?.length) {
      return Number.isFinite(node.value) ? node.value : 0;
    }
    const sum = node.children.reduce((acc, c) => acc + this.deriveValues(c), 0);
    if (!Number.isFinite(node.value) || node.value === 0) node.value = sum;
    return node.value;
  }

  private applyColors(node: TreeNode<T>): void {
    const items = node.children;
    if (!items?.length) return;

    const colors = this.cfg.colors;
    if (!colors.length) return;

    const chosen = colors[this.colorIdx % colors.length];
    let colorRange: string[] | null = null;

    // ВАЖНО: намеренно повторяем логику из твоего кода:
    // colorsByLength возвращает length+2, а мы берём первые length элементов.
    if (Array.isArray(chosen)) {
      colorRange = colorsByLength(chosen[0], chosen[1], items.length);
    }

    let leafNodes = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!defined(item.color)) {
        item.color = colorRange ? colorRange[i] : (chosen as string);
      }

      if (!item.children?.length) leafNodes = true;
    }

    if (leafNodes) this.colorIdx++;

    for (const c of items) this.applyColors(c);
  }

  private layoutNode(node: TreeNode<T>, layout: Layout): void {
    const children = node.children?.filter(c => !(Number.isFinite(c.value) && c.value === 0)) ?? [];
    if (!children.length) return;

    const title = this.titleSizeFor(node);
    const t = this.cfg.type;

    const content: Coord =
      (t === 'horizontal')
        ? { width: Math.max(0, node.coord.width - title), height: node.coord.height, top: 0, left: 0 }
        : { width: node.coord.width, height: Math.max(0, node.coord.height - title), top: 0, left: 0 };

    if (content.width < this.cfg.minTileSize || content.height < this.cfg.minTileSize) {
      node.children = undefined;
      return;
    }

    // compute coords for children
    layout.compute(children, content);

    // recurse
    for (const c of children) {
      if (c.coord.width < this.cfg.minTileSize || c.coord.height < this.cfg.minTileSize) {
        c.children = undefined;
        continue;
      }
      this.layoutNode(c, layout);
    }
  }

  private roundCoordsDeep(node: TreeNode<T>, decimals: number): void {
    if (node.dataItem) {
      node.coord = {
        width: roundN(node.coord.width, decimals),
        height: roundN(node.coord.height, decimals),
        top: roundN(node.coord.top, decimals),
        left: roundN(node.coord.left, decimals)
      };
    }
    if (node.children?.length) {
      for (const c of node.children) this.roundCoordsDeep(c, decimals);
    }
  }

  private buildPath(node: TreeNode<T>): T[] {
    if (!this.root) return [];
    const targetUid = node.uid;

    const stack: Array<{ n: TreeNode<T>; path: T[] }> = [{ n: this.root, path: [] }];
    while (stack.length) {
      const cur = stack.pop()!;
      const n = cur.n;

      if (n.uid === targetUid) return cur.path;

      const children = n.children ?? [];
      for (const c of children) {
        const nextPath = c.dataItem ? [...cur.path, c.dataItem] : cur.path;
        stack.push({ n: c, path: nextPath });
      }
    }
    return [];
  }

  private nextUid(): string {
    this.uidSeq += 1;
    return `tm_${this.uidSeq}`;
  }
}

// ================= Layouts (по твоему коду) =================

interface Layout {
  compute(children: TreeNode[], coord: Coord): void;
}

class SquarifiedLayout implements Layout {
  private orientation: 'h' | 'v' = 'h';

  compute(children: TreeNode[], coord: Coord): void {
    if (!(coord.width >= coord.height && this.layoutHorizontal())) {
      this.layoutChange();
    }
    if (children.length > 0) this.layoutChildren(children, coord);
  }

  private layoutChildren(items: TreeNode[], coord: Coord): void {
    const parentArea = coord.width * coord.height;
    let totalArea = 0;
    const itemsArea: number[] = [];

    for (let i = 0; i < items.length; i++) {
      itemsArea[i] = parseFloat(String(items[i].value ?? 0));
      totalArea += itemsArea[i];
    }
    if (totalArea <= 0) return;

    for (let i = 0; i < itemsArea.length; i++) {
      items[i].area = parentArea * itemsArea[i] / totalArea;
    }

    const minimumSideValue = this.layoutHorizontal() ? coord.height : coord.width;

    const firstElement = [items[0]];
    const tail = items.slice(1);
    this.squarify(tail, firstElement, minimumSideValue, coord);
  }

  private squarify(tail: TreeNode[], initElement: TreeNode[], width: number, coord: Coord): void {
    this.computeDim(tail, initElement, width, coord);
  }

  private computeDim(tail: TreeNode[], initElement: TreeNode[], width: number, coord: Coord): void {
    if (tail.length + initElement.length === 1) {
      const element = tail.length === 1 ? tail : initElement;
      this.layoutLast(element, coord);
      return;
    }

    if (tail.length >= 2 && initElement.length === 0) {
      initElement = [tail[0]];
      tail = tail.slice(1);
    }

    if (tail.length === 0) {
      if (initElement.length > 0) this.layoutRow(initElement, width, coord);
      return;
    }

    const firstElement = tail[0];

    if (this.worstAspectRatio(initElement, width) >= this.worstAspectRatio([firstElement, ...initElement], width)) {
      this.computeDim(tail.slice(1), [...initElement, firstElement], width, coord);
    } else {
      const newCoords = this.layoutRow(initElement, width, coord);
      this.computeDim(tail, [], newCoords.dim, newCoords);
    }
  }

  private layoutLast(items: TreeNode[], coord: Coord): void {
    items[0].coord = coord;
  }

  private layoutRow(items: TreeNode[], width: number, coord: Coord): (Coord & { dim: number }) {
    return this.layoutHorizontal() ? this.layoutV(items, width, coord) : this.layoutH(items, width, coord);
  }

  private layoutVertical(): boolean { return this.orientation === 'v'; }
  private layoutHorizontal(): boolean { return this.orientation === 'h'; }

  private layoutChange(): void {
    this.orientation = this.layoutVertical() ? 'h' : 'v';
  }

  private worstAspectRatio(items: TreeNode[], width: number): number {
    if (!items || items.length === 0) return MAX_VALUE;

    let areaSum = 0;
    let maxArea = 0;
    let minArea = MAX_VALUE;

    for (let i = 0; i < items.length; i++) {
      const area = items[i].area ?? 0;
      areaSum += area;
      minArea = (minArea < area) ? minArea : area;
      maxArea = (maxArea > area) ? maxArea : area;
    }
    if (areaSum <= 0) return MAX_VALUE;

    return Math.max(
      (width * width * maxArea) / (areaSum * areaSum),
      (areaSum * areaSum) / (width * width * minArea)
    );
  }

  private layoutV(items: TreeNode[], width: number, coord: Coord): (Coord & { dim: number }) {
    const totalArea = totalAreaOf(items);
    let top = 0;

    width = round(totalArea / width);

    for (let i = 0; i < items.length; i++) {
      const height = round((items[i].area ?? 0) / width);
      items[i].coord = {
        height,
        width,
        top: coord.top + top,
        left: coord.left
      };
      top += height;
    }

    const ans: Coord & { dim: number } = {
      height: coord.height,
      width: coord.width - width,
      top: coord.top,
      left: coord.left + width,
      dim: 0
    };

    ans.dim = Math.min(ans.width, ans.height);
    if (ans.dim !== ans.height) this.layoutChange();
    return ans;
  }

  private layoutH(items: TreeNode[], width: number, coord: Coord): (Coord & { dim: number }) {
    const totalArea = totalAreaOf(items);

    const height = round(totalArea / width);
    const top = coord.top;
    let left = 0;

    for (let i = 0; i < items.length; i++) {
      items[i].coord = {
        height,
        width: round((items[i].area ?? 0) / height),
        top,
        left: coord.left + left
      };
      left += items[i].coord.width;
    }

    const ans: Coord & { dim: number } = {
      height: coord.height - height,
      width: coord.width,
      top: coord.top + height,
      left: coord.left,
      dim: 0
    };

    ans.dim = Math.min(ans.width, ans.height);
    if (ans.dim !== ans.width) this.layoutChange();
    return ans;
  }
}

class SliceAndDiceLayout implements Layout {
  private vertical: boolean;
  private quotient: number;

  constructor(vertical: boolean) {
    this.vertical = vertical;
    this.quotient = vertical ? 1 : 0;
  }

  compute(children: TreeNode[], coord: Coord): void {
    if (children.length === 0) return;

    const parentArea = coord.width * coord.height;
    let totalArea = 0;
    const itemsArea: number[] = [];

    for (let i = 0; i < children.length; i++) {
      itemsArea[i] = parseFloat(String(children[i].value ?? 0));
      totalArea += itemsArea[i];
      children[i].vertical = this.vertical;
    }
    if (totalArea <= 0) return;

    for (let i = 0; i < itemsArea.length; i++) {
      children[i].area = parentArea * itemsArea[i] / totalArea;
    }

    this.sliceAndDice(children, coord);
  }

  private sliceAndDice(items: TreeNode[], coord: Coord): void {
    const totalArea = totalAreaOf(items);
    if ((items[0].level % 2) === this.quotient) {
      this.layoutHorizontal(items, coord, totalArea);
    } else {
      this.layoutVertical(items, coord, totalArea);
    }
  }

  private layoutHorizontal(items: TreeNode[], coord: Coord, totalArea: number): void {
    let left = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const width = (item.area ?? 0) / (totalArea / coord.width);

      item.coord = {
        height: coord.height,
        width,
        top: coord.top,
        left: coord.left + left
      };
      left += width;
    }
  }

  private layoutVertical(items: TreeNode[], coord: Coord, totalArea: number): void {
    let top = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const height = (item.area ?? 0) / (totalArea / coord.height);

      item.coord = {
        height,
        width: coord.width,
        top: coord.top + top,
        left: coord.left
      };
      top += height;
    }
  }
}

// ================= Utils (максимально близко к твоему коду) =================

function getField(path: string, row: any): any {
  if (row === null || row === undefined) return row;
  const parts = String(path ?? '').split('.').filter(Boolean);
  let cur = row;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function defined(value: any): boolean {
  return typeof value !== UNDEFINED;
}

function toNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}


function totalAreaOf(items: TreeNode[]): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) total += (items[i].area ?? 0);
  return total;
}

function round(value: number): number {
  const power = Math.pow(10, 4);
  return Math.round(value * power) / power;
}

function roundN(value: number, decimals: number): number {
  const power = Math.pow(10, decimals);
  return Math.round(value * power) / power;
}

function colorsByLength(min: string, max: string, length: number): string[] {
  const minRGBtoDecimal = rgbToDecimal(min);
  const maxRGBtoDecimal = rgbToDecimal(max);
  const isDarker = colorBrightness(min) - colorBrightness(max) < 0;
  const colors: string[] = [];

  colors.push(min);

  for (let i = 0; i < length; i++) {
    const rgbColor = {
      r: colorByIndex(minRGBtoDecimal.r, maxRGBtoDecimal.r, i, length, isDarker),
      g: colorByIndex(minRGBtoDecimal.g, maxRGBtoDecimal.g, i, length, isDarker),
      b: colorByIndex(minRGBtoDecimal.b, maxRGBtoDecimal.b, i, length, isDarker)
    };
    colors.push(buildColorFromRGB(rgbColor));
  }

  colors.push(max);
  return colors;
}

function colorByIndex(min: number, max: number, index: number, length: number, isDarker: boolean): number {
  const minColor = Math.min(Math.abs(min), Math.abs(max));
  const maxColor = Math.max(Math.abs(min), Math.abs(max));
  const step = (maxColor - minColor) / (length + 1);
  const currentStep = step * (index + 1);

  return isDarker ? (minColor + currentStep) : (maxColor - currentStep);
}

function buildColorFromRGB(color: { r: number; g: number; b: number }): string {
  return '#' + decimalToRgb(color.r) + decimalToRgb(color.g) + decimalToRgb(color.b);
}

function rgbToDecimal(color: string): { r: number; g: number; b: number } {
  color = color.replace('#', '');
  const rgbColor = colorToRGB(color);

  return {
    r: rgbToHex(rgbColor.r),
    g: rgbToHex(rgbColor.g),
    b: rgbToHex(rgbColor.b)
  };
}

function decimalToRgb(number: number): string {
  let result = Math.round(number).toString(16).toUpperCase();
  if (result.length === 1) result = '0' + result;
  return result;
}

function colorToRGB(color: string): { r: string; g: string; b: string } {
  const colorLength = color.length;
  const rgbColor: any = {};
  if (colorLength === 3) {
    rgbColor.r = color[0];
    rgbColor.g = color[1];
    rgbColor.b = color[2];
  } else {
    rgbColor.r = color.substring(0, 2);
    rgbColor.g = color.substring(2, 4);
    rgbColor.b = color.substring(4, 6);
  }
  return rgbColor;
}

function rgbToHex(rgb: string): number {
  return parseInt((rgb as any).toString(16), 16);
}

function colorBrightness(color?: string): number {
  let brightness = 0;
  if (color) {
    const c = rgbToDecimal(color);
    brightness = Math.sqrt(0.241 * c.r * c.r + 0.691 * c.g * c.g + 0.068 * c.b * c.b);
  }
  return brightness;
}
