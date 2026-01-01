import { Coord, Layout, TreeNode } from './tree-map.models';
import { round, totalAreaOf } from './tree-map.utils';

const MAX_VALUE = Number.MAX_VALUE;

export class SquarifiedLayout implements Layout {
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

export class SliceAndDiceLayout implements Layout {
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
