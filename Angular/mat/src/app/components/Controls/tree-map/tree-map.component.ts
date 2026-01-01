import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { Coord, Layout, TreeMapEvent, TreeMapOptions, TreeMapTileContext, TreeNode } from './tree-map.models';
import { SliceAndDiceLayout, SquarifiedLayout } from './tree-map.layouts';
import { colorBrightness, colorsByLength, defined, getField, projectColorByValue, roundN, toNumber } from './tree-map.utils';

@Component({
  selector: 'stockchart-treemap',
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
      colorScale: undefined,
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
    const hasText = (node.text ?? '').trim().length > 0;
    const hasTpl = !!this.titleTemplate;
    if (!hasText && !hasTpl) return 0;
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

      // Пропускаем только "пустые" листья без детей и нулевой value; контейнеры с children оставляем,
      // чтобы значение пересчиталось от потомков и дерево не опустело (случай value=0 у корня данных).
      if (Number.isFinite(node.value) && node.value === 0 && !childrenArr.length) continue;

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

    if (this.cfg.colorScale) {
      this.applyProjectedColors(items, this.cfg.colorScale);
    }

    const colors = this.cfg.colors;
    if (colors.length) {
      this.applyPaletteColors(items, colors);
    } else {
      this.applyFallbackColors(items);
    }

    for (const c of items) this.applyColors(c);
  }

  private applyProjectedColors(nodes: TreeNode<T>[], scale: NonNullable<TreeMapOptions['colorScale']>): void {
    const values = nodes.flatMap(n => this.collectValues(n));
    if (!values.length) return;

    const min = Math.min(...values);
    const max = Math.max(...values);

    const allNodes = nodes.flatMap(n => this.collectNodes(n));
    for (const n of allNodes) {
      if (!defined(n.color)) {
        n.color = projectColorByValue(n.value ?? 0, min, max, scale);
      }
    }
  }

  private applyPaletteColors(nodes: TreeNode<T>[], colors: Array<string | [string, string]>): void {
    if (!nodes.length) return;

    const chosen = colors[this.colorIdx % colors.length];
    let colorRange: string[] | null = null;

    // ВАЖНО: намеренно повторяем логику из твоего кода:
    // colorsByLength возвращает length+2, а мы берём первые length элементов.
    if (Array.isArray(chosen)) {
      colorRange = colorsByLength(chosen[0], chosen[1], nodes.length);
    }

    let leafNodes = false;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (!defined(node.color)) {
        node.color = colorRange ? colorRange[i] : (chosen as string);
      }

      if (!node.children?.length) leafNodes = true;
    }

    if (leafNodes) this.colorIdx++;
  }

  private applyFallbackColors(nodes: TreeNode<T>[]): void {
    for (const n of nodes) {
      if (!defined(n.color)) n.color = '#B0B0B0';
    }
  }

  private collectNodes(node: TreeNode<T>): TreeNode<T>[] {
    const res: TreeNode<T>[] = [node];
    for (const c of node.children ?? []) res.push(...this.collectNodes(c));
    return res;
  }

  private collectValues(node: TreeNode<T>): number[] {
    if (!node.children?.length) return [node.value ?? 0];
    return node.children.flatMap(c => this.collectValues(c));
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

