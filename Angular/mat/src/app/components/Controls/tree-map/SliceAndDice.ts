// slice-and-dice.service.ts
import { Injectable } from '@angular/core';
import { TreeNode, Coord, TreeLayout } from './tree-layout.interface';


export class SliceAndDice implements TreeLayout {
  vertical: boolean;
  quotient: number;

  createRoot(root: TreeNode, width: number, height: number, vertical: boolean = false): void {
    if(height==0)
      height = 500;
    root.coord = {
      width: width,
      height: height,
      top: 0,
      left: 0
    };
    root.vertical = vertical;
  }

  constructor(vertical: boolean) {
    this.vertical = vertical;
    this.quotient = vertical ? 1 : 0;
  }

  compute(children: TreeNode[], rootCoord: Coord, htmlSize: { text: number }): void {
    if (children.length > 0) {
      let width = rootCoord.width;
      let height = rootCoord.height;

      if (this.vertical) {
        height -= htmlSize.text;
      } else {
        width -= htmlSize.text;
      }

      const newRootCoord: Coord = {
        width: width,
        height: height,
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

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      itemsArea[i] = parseFloat(items[i].value.toString());
      totalArea += itemsArea[i];
      item.vertical = this.vertical;
    }

    for (let i = 0; i < itemsArea.length; i++) {
      items[i].area = (parentArea * itemsArea[i]) / totalArea;
    }

    this.sliceAndDice(items, coord);
  }

  sliceAndDice(items: TreeNode[], coord: Coord): void {
    const totalArea = this._totalArea(items);
    if (items[0].level! % 2 === this.quotient) {
      this.layoutHorizontal(items, coord, totalArea);
    } else {
      this.layoutVertical(items, coord, totalArea);
    }
  }

  layoutHorizontal(items: TreeNode[], coord: Coord, totalArea: number): void {
    let left = 0;

    for (const item of items) {
      const width = item.area! / (totalArea / coord.width);
      item.coord = {
        height: coord.height,
        width: width,
        top: coord.top,
        left: coord.left + left
      };

      left += width;
    }
  }

  layoutVertical(items: TreeNode[], coord: Coord, totalArea: number): void {
    let top = 0;

    for (const item of items) {
      const height = item.area! / (totalArea / coord.height);
      item.coord = {
        height: height,
        width: coord.width,
        top: coord.top + top,
        left: coord.left
      };

      top += height;
    }
  }

  private _totalArea(items: TreeNode[]): number {
    return items.reduce((total, item) => total += item.area!, 0);
  }
}
