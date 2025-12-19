import { Injectable } from '@angular/core';
import { HtmlSize, TreeNode, TreeView } from './tree-layout.interface';
import { colorBrightness } from './color-utils';



export class SquarifiedView implements TreeView {
  private options: any;
  private element: HTMLElement;
  private offset: number = 0;
  private orientation: string = 'h';
  

  constructor(treeMap: any, options: any)  {
    this.options = { ...this.options, ...options };
    this.element = treeMap.element;
  }

  titleSize(item: TreeNode, element: HTMLElement): number {
    const text = element.querySelector('.k-treemap-title');
    return text ? text.clientHeight : 0;
  }

  htmlSize(root: TreeNode): HtmlSize {
    const rootElement = this._getByUid(root.dataItem.uid);
    const htmlSize: HtmlSize = { text: 0, offset: 0 };

    if (root.children) {
      this._clean(rootElement);

      const text = this._getText(root);
      if (text) {
        const title = this._createTitle(root);
        rootElement.appendChild(title);

        this._compile(title, root.dataItem);

        htmlSize.text = title.clientHeight;
      }

      rootElement.appendChild(this._createWrap());

      this.offset = (rootElement.offsetWidth - rootElement.clientWidth) / 2;
    }

    return htmlSize;
  }

  protected _compile(element: HTMLElement, dataItem: any): void {
/*

    this.treeMap.angular("compile", function() {
      return {
          elements: element,
          data: [ { dataItem: dataItem } ]
      };
  });*/
    // Implement your logic to compile the element, typically Angular compile
  }

  protected _getByUid(uid: string): HTMLElement {
    return this.element.querySelector(`.k-treemap-tile[data-uid="${uid}"]`) as HTMLElement;
  }

  render(root: TreeNode, rootWrap: Element): void {
    const rootElement = this._getByUid(root.dataItem.uid);
    const children = root.children;
    if (children) {
     // const rootWrap = rootElement.querySelector('.k-treemap-wrap');

      for (const leaf of children) {
        const htmlElement: HTMLElement = this._createLeaf(leaf);
        rootWrap?.appendChild(htmlElement);

        this._compile(htmlElement.children[0] as HTMLElement, leaf.dataItem);

        // Trigger item created event
        // this.treeMap.trigger(ITEM_CREATED, { element: htmlElement });
      }
    }
  }

  createRoot(root: TreeNode): HTMLElement {
    const htmlElement = this._createLeaf(root);
    this.element.appendChild(htmlElement);
    this._compile(htmlElement.children[0] as HTMLElement, root.dataItem);

    return htmlElement;
    // Trigger item created event
    // this.treeMap.trigger(ITEM_CREATED, { element: htmlElement });
  }

  protected _clean(root: HTMLElement): void {
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
  }

  protected _createLeaf(item: TreeNode): HTMLElement {
    const tile = this._createTile(item);
    tile.style.backgroundColor = item.color || '';
    tile.classList.add('k-leaf');

    if (this._tileColorBrightness(item) > 180) {
        tile.classList.add('k-inverse');
    }

    // Установим видимость элемента
    tile.style.display = item.value !== 0 ? 'block' : 'none';

    const div = document.createElement('div');
    div.innerHTML = this._getText(item);
    tile.appendChild(div);

    return tile;
}

  protected _createTile(item: TreeNode): HTMLElement {
    const tile = document.createElement('div');
    tile.classList.add('k-treemap-tile');
    this.setItemSize(item, tile);

    if (item.dataItem && item.dataItem.uid) {
      tile.setAttribute('data-uid', item.dataItem.uid);
    }

    return tile;
  }

  protected _itemCoordinates(item: TreeNode): any {
    const coordinates = {
      width: item.coord?.width || 0,
      height: item.coord?.height || 0,
      left: item.coord?.left || 0,
      top: item.coord?.top || 0
    };

    if (coordinates.left && this.offset) {
      coordinates.width += this.offset * 2;
    } else {
      coordinates.width += this.offset;
    }

    if (coordinates.top) {
      coordinates.height += this.offset * 2;
    } else {
      coordinates.height += this.offset;
    }

    return coordinates;
  }

  setItemSize(item: TreeNode, element: HTMLElement): void {
    const coordinates = this._itemCoordinates(item);
    element.style.width = `${coordinates.width}px`;
    element.style.height = `${coordinates.height}px`;
    element.style.left = `${coordinates.left}px`;
    element.style.top = `${coordinates.top}px`;
  }

  protected _getText(item: TreeNode): string {
    
    return  item.text || '';
    let text = item.text || '';

    if (this.options.template) {
      text = this._renderTemplate(item);
    }

    return text;
  }

  protected _renderTemplate(item: TreeNode): string {
    const titleTemplate = this.options.template;
    return titleTemplate({
      dataItem: item.dataItem,
      text: item.text
    });
  }

  protected _createTitle(item: TreeNode): HTMLElement {
    const title = document.createElement('div');
    title.classList.add('k-treemap-title');
    const innerDiv = document.createElement('div');
    innerDiv.innerHTML = this._getText(item);
    title.appendChild(innerDiv);
    return title;
  }

  protected _createWrap(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.classList.add('k-treemap-wrap');
    return wrap;
  }

  private _tileColorBrightness(item: TreeNode): number {
    // Implement your logic to determine the brightness of the color
    return colorBrightness(item.color);
    return 0; // Placeholder value
  }

  private _totalArea(items: TreeNode[]): number {
    return items.reduce((total, item) => total + item.area, 0);
  }

  private _worstAspectRatio(items: TreeNode[], width: number): number {
    if (!items || items.length === 0) {
      return Number.MAX_VALUE;
    }

    const areaSum = items.reduce((sum, item) => sum + item.area, 0);
    const maxArea = Math.max(...items.map(item => item.area));
    const minArea = Math.min(...items.map(item => item.area));

    return Math.max(
      (width * width * maxArea) / (areaSum * areaSum),
      (areaSum * areaSum) / (width * width * minArea)
    );
  }

  private _layoutRow(items: TreeNode[], width: number, coord: any): any {
    if (this._layoutHorizontal()) {
      return this._layoutV(items, width, coord);
    } else {
      return this._layoutH(items, width, coord);
    }
  }

  private _layoutV(items: TreeNode[], width: number, coord: any): any {
    const totalArea = this._totalArea(items);
    let top = 0;

    const newWidth = Math.round(totalArea / width);

    for (const item of items) {
      const height = Math.round(item.area / newWidth);
      item.coord = {
        height: height,
        width: newWidth,
        top: coord.top + top,
        left: coord.left
      };
      top += height;
    }

    const newCoord = {
      height: coord.height,
      width: coord.width - newWidth,
      top: coord.top,
      left: coord.left + newWidth
    };

    newCoord['dim'] = Math.min(newCoord.width, newCoord.height);

    if (newCoord['dim'] !== newCoord.height) {
      this._layoutChange();
    }

    return newCoord;
  }

  private _layoutH(items: TreeNode[], width: number, coord: any): any {
    const totalArea = this._totalArea(items);
    const height = Math.round(totalArea / width);
    let left = 0;

    for (const item of items) {
      item.coord = {
        height: height,
        width: Math.round(item.area / height),
        top: coord.top,
        left: coord.left + left
      };
      left += item.coord.width;
    }

    const newCoord = {
      height: coord.height - height,
      width: coord.width,
      top: coord.top + height,
      left: coord.left
    };

    newCoord['dim'] = Math.min(newCoord.width, newCoord.height);

    if (newCoord['dim'] !== newCoord.width) {
      this._layoutChange();
    }

    return newCoord;
  }

  private _computeDim(tail: TreeNode[], initElement: TreeNode[], width: number, coord: any): void {
    if (tail.length + initElement.length === 1) {
      const element = tail.length === 1 ? tail : initElement;
      this._layoutLast(element, width, coord);
      return;
    }

    if (tail.length >= 2 && initElement.length === 0) {
      initElement = [tail[0]];
      tail = tail.slice(1);
    }

    if (tail.length === 0) {
      if (initElement.length > 0) {
        coord = this._layoutRow(initElement, width, coord);
      }
      return;
    }

    const newTail = tail.slice(1);
    const newInitElement = [...initElement, tail[0]];
    const aspectRatio1 = this._worstAspectRatio(newInitElement, width);
    const aspectRatio2 = this._worstAspectRatio(initElement, width);

    if (aspectRatio1 <= aspectRatio2) {
      this._computeDim(newTail, newInitElement, width, coord);
    } else {
      coord = this._layoutRow(initElement, width, coord);
      this._computeDim(tail, [], coord.dim, coord);
    }
  }

  private _layoutLast(items: TreeNode[], width: number, coord: any): any {
    if (this._layoutHorizontal()) {
      return this._layoutV(items, width, coord);
    } else {
      return this._layoutH(items, width, coord);
    }
  }

  private _layoutChange(): void {
    if (this.orientation === 'h') {
      this.orientation = 'v';
    } else {
      this.orientation = 'h';
    }
  }

  private _layoutHorizontal(): boolean {
    return this.orientation === 'h';
  }

  private _layoutVertical(): boolean {
    return this.orientation === 'v';
  }

  compute(children: TreeNode[], rootCoord: any, htmlSize: HtmlSize): void {
    const coord = {
      width: rootCoord.width - 2 * this.offset,
      height: rootCoord.height - htmlSize.text - 2 * this.offset,
      top: htmlSize.text + this.offset,
      left: this.offset
    };
    coord['dim'] = Math.min(coord.width, coord.height);

    this._computeDim(children, [], coord['dim'], coord);
  }
}
