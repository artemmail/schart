import { Injectable } from '@angular/core';
import { TreeNode, Coord, TreeLayout } from './tree-layout.interface';


export class Squarified implements TreeLayout {
  orientation: 'h' | 'v' = 'h';

  

  createRoot(root: TreeNode, width: number, height: number): void {
    if(height==0)
      height = 500;
    root.coord = {
      width: width,
      height: height,
      top: 0,
      left: 0
    };
  }

  compute(children: TreeNode[], rootCoord: Coord, htmlSize: { text: number }): void {
    if (!(rootCoord.width >= rootCoord.height && this.layoutHorizontal())) {
      this.layoutChange();
    }

    if (children && children.length > 0) {
      const newRootCoord: Coord = {
        width: rootCoord.width,
        height: rootCoord.height - htmlSize.text,
        top: 0,
        left: 0
      };

      this.layoutChildren(children, newRootCoord);
    }
  }

  layoutChildren(items: TreeNode[], coord: Coord): void {
    const parentArea = coord.width * coord.height;
    let totalArea = 0;
    const itemsArea: number[] = [];

    for (const item of items) {
      const area = parseFloat(item.value.toString());
      itemsArea.push(area);
      totalArea += area;
    }

    for (let i = 0; i < items.length; i++) {
      items[i].area = (parentArea * itemsArea[i]) / totalArea;
    }

    const minimumSideValue = this.layoutHorizontal() ? coord.height : coord.width;

    const firstElement = [items[0]];
    const tail = items.slice(1);
    this.squarify(tail, firstElement, minimumSideValue, coord);
  }

  squarify(tail: TreeNode[], initElement: TreeNode[], width: number, coord: Coord): void {
    this.computeDim(tail, initElement, width, coord);
  }

  computeDim(tail: TreeNode[], initElement: TreeNode[], width: number, coord: Coord): void {
    if (tail.length + initElement.length === 1) {
      const element = tail.length === 1 ? tail : initElement;
      this.layoutLast(element, width, coord);
      return;
    }

    if (tail.length >= 2 && initElement.length === 0) {
      initElement = [tail[0]];
      tail = tail.slice(1);
    }

    if (tail.length === 0) {
      if (initElement.length > 0) {
        this.layoutRow(initElement, width, coord);
      }
      return;
    }

    const firstElement = tail[0];

    if (this.worstAspectRatio(initElement, width) >= this.worstAspectRatio([firstElement, ...initElement], width)) {
      this.computeDim(tail.slice(1), [...initElement, firstElement], width, coord);
    } else {
      const newCoords = this.layoutRow(initElement, width, coord);
      this.computeDim(tail, [], newCoords.dim!, newCoords);
    }
  }

  layoutLast(items: TreeNode[], width: number, coord: Coord): void {
    items[0].coord = coord;
  }

  layoutRow(items: TreeNode[], width: number, coord: Coord): Coord {
    return this.layoutHorizontal() ? this.layoutV(items, width, coord) : this.layoutH(items, width, coord);
  }

  layoutVertical(): boolean {
    return this.orientation === 'v';
  }

  layoutHorizontal(): boolean {
    return this.orientation === 'h';
  }

  layoutChange(): void {
    this.orientation = this.layoutVertical() ? 'h' : 'v';
  }

  worstAspectRatio(items: TreeNode[], width: number): number {
    if (!items || items.length === 0) {
      return Number.MAX_VALUE;
    }

    let areaSum = 0;
    let maxArea = 0;
    let minArea = Number.MAX_VALUE;

    for (const item of items) {
      const area = item.area!;
      areaSum += area;
      minArea = Math.min(minArea, area);
      maxArea = Math.max(maxArea, area);
    }

    return Math.max(
      (width * width * maxArea) / (areaSum * areaSum),
      (areaSum * areaSum) / (width * width * minArea)
    );
  }

  layoutV(items: TreeNode[], width: number, coord: Coord): Coord {
    const totalArea = this._totalArea(items);
    let top = 0;

    width = Math.round(totalArea / width);

    for (const item of items) {
      const height = Math.round(item.area! / width);
      item.coord = {
        height: height,
        width: width,
        top: coord.top + top,
        left: coord.left
      };

      top += height;
    }

    const ans: Coord = {
      height: coord.height,
      width: coord.width - width,
      top: coord.top,
      left: coord.left + width,
      dim: Math.min(coord.width - width, coord.height)
    };

    if (ans.dim !== ans.height) {
      this.layoutChange();
    }

    return ans;
  }

  layoutH(items: TreeNode[], width: number, coord: Coord): Coord {
    const totalArea = this._totalArea(items);
    const height = Math.round(totalArea / width);
    let left = 0;

    for (const item of items) {
      item.coord = {
        height: height,
        width: Math.round(item.area! / height),
        top: coord.top,
        left: coord.left + left
      };
      left += item.coord.width;
    }

    const ans: Coord = {
      height: coord.height - height,
      width: coord.width,
      top: coord.top + height,
      left: coord.left,
      dim: Math.min(coord.width, coord.height - height)
    };

    if (ans.dim !== ans.width) {
      this.layoutChange();
    }

    return ans;
  }

  private _totalArea(items: TreeNode[]): number {
    return items.reduce((total, item) => total += item.area!, 0);
  }

  leaf(tree: TreeNode): boolean {
    return !tree.children;
  }
}
