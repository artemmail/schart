


import { Component, ElementRef, Input, AfterViewInit, ViewChild } from '@angular/core';
import { TreeMapService } from './treemapservice';
export interface TreemapNode {
  name: string;
  value: number;
  color: string;
  children?: TreemapNode[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}


@Component({
  selector: 'app-tree-map',
  template: `
    <div #treeMapContainer class="tree-map-container" style="width: 500px;height:500px"></div>
  `,
  styleUrls: ['./tree-map.component.css']
})
export class TreeMapComponent implements AfterViewInit {
  @ViewChild('treeMapContainer', { static: false }) treeMapContainer!: ElementRef;
  @Input() options: any;

  constructor(private treeMapService: TreeMapService) {}

  ngAfterViewInit(): void {
    
    if (this.treeMapContainer) {
      this.treeMapService.init(this.treeMapContainer.nativeElement, this.options);
    }
  }

  ngOnDestroy(): void {
    this.treeMapService.destroy();
  }

  resize(): void {
    this.treeMapService.resize();
  }
}

/*

import { Component, OnInit, ViewChild, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

export interface TreemapNode {
  name: string;
  value: number;
  color: string;
  children?: TreemapNode[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}


@Component({
  selector: 'app-treemap',
  templateUrl: './tree-map.component.html',
  styleUrls: ['./tree-map.component.css']
})
export class TreeMapComponent implements OnInit, OnChanges {
  @ViewChild('treemapContainer', { static: true }) private treemapContainer: ElementRef;
  @Input() data: TreemapNode;

  constructor() {}

  ngOnInit() {
    
    this.createTreemap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && !changes['data'].firstChange) {
      this.createTreemap();
    }
  }

  private createTreemap() {
    if (!this.data) return;

    const element = this.treemapContainer.nativeElement;
    const width = element.clientWidth;
    const height = element.clientHeight + 300;

    this.clearContainer(element);

    const root = this.prepareData(this.data, width, height);
    this.drawTreemap(root, element);
  }

  private clearContainer(element: any) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  private prepareData(data: TreemapNode, width: number, height: number) {
    const root = {
      ...data,
      x: 0,
      y: 0,
      width: width,
      height: height
    };

    const stack: TreemapNode[] = [root];
    while (stack.length > 0) {
      const node:any = stack.pop();
      if (node.children && node.children.length) {
        const totalValue = node.children.reduce((sum, child) => sum + child.value, 0);
        let xOffset = node.x;
        let yOffset = node.y;
        node.children.forEach(child => {
          const widthRatio = child.value / totalValue;
          child.x = xOffset;
          child.y = yOffset;
          child.width = widthRatio * node.width;
          child.height = node.height;
          xOffset += child.width;
          stack.push(child);
        });
      }
    }

    return root;
  }

  private drawTreemap(root: TreemapNode, element: any) {
    const stack: TreemapNode[] = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      this.drawNode(node, element);
      if (node.children && node.children.length) {
        stack.push(...node.children);
      }
    }
  }

  private drawNode(node: TreemapNode, element: any) {
    const div = document.createElement('div');
    div.className = 'treemap-node';
    div.style.left = `${node.x}px`;
    div.style.top = `${node.y}px`;
    div.style.width = `${node.width}px`;
    div.style.height = `${node.height}px`;
    div.style.backgroundColor = node.color;

    const span = document.createElement('span');
    span.textContent = "node.name";
    div.appendChild(span);

    element.appendChild(div);
  }
}
*/