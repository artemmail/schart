import { Injectable } from '@angular/core';

import { HierarchicalDataSource } from './hierarchical-data-source';
import { defined, colorsByLength, colorBrightness, round } from './color-utils';
import { SliceAndDice } from './SliceAndDice';
import { SliceAndDiceView } from './SliceAndDiceView';
import { SquarifiedView } from './squarifiedView';
import { Squarified } from './Squarified';
import { Options, TreeNode } from './tree-layout.interface';

const DATA_BOUND = 'dataBound';



@Injectable({
  providedIn: 'root'
})
export class TreeMapService {
    private element: HTMLElement;
    private options: Options;
    private view: SliceAndDiceView | SquarifiedView;
    private layout: SliceAndDice | Squarified;
    private root: any;
    private dataSource: any;
    private colorIdx: number;
  
    init(element: any, options: any): void {
      return
      this.element = element;
      this.options = options;
      this.element.classList.add('k-widget', 'k-treemap');
      this.setLayout();
      this.initDataSource();
      this.attachEvents();
    }
  
    destroy(): void {
      this.element.classList.remove('k-widget', 'k-treemap');
      this.element.innerHTML = '';
    }
  
    private setLayout(): void {
      if (this.options.type === 'horizontal') {
        this.layout = new SliceAndDice(false);
        this.view = new SliceAndDiceView(this, this.options);
      } else if (this.options.type === 'vertical') {
        this.layout = new SliceAndDice(true);
        this.view = new SliceAndDiceView(this, this.options);
      } else {
        this.layout = new Squarified();
        this.view = new SquarifiedView(this, this.options);
      }
    }
  
    private initDataSource(): void {
      this.dataSource = HierarchicalDataSource.create(this.options.dataSource);
      if (this.options.autoBind) {
        this.dataSource.fetch().then((e: any) => this.onDataChange(e, null));
      }
    }
  
    private attachEvents(): void {
      this.element.addEventListener('mouseover', this.mouseover.bind(this));
      this.element.addEventListener('mouseleave', this.mouseleave.bind(this));
    }
  
    private onDataChange(e: any, rootWrap: Element): void {
      const node = e.node;
      let items = e.items;
      const options = this.options;
      let item;
  
      if (!rootWrap) {
        
          this.cleanItems();
          this.element.innerHTML = 'sdgsdfgsdfgsdgsdfgsdgsdfgsdfgsdfg';
          item = this.wrapItem(items[0]);
          this.layout.createRoot(
              item,
              this.element.clientWidth,
              this.element.clientHeight,
              this.options.type === 'vertical'
          );
          let rootElement =  this.view.createRoot(item);

          this.element.appendChild(rootElement);
          this.root = item;
          this.colorIdx = 0;

          for (let i = 0; i < items.length; i++) {
             this.onDataChange( items[i], rootElement);
        }


      } else {
        
          if (items.length) {
              const root = this.getByUid(node.uid);
              root.children = [];
              items = this.sortForGrouping(items, options.valueField, "desc");
  
              for (let i = 0; i < items.length; i++) {
                  item = items[i];
                  root.children.push(this.wrapItem(item));
              }
  
              const htmlSize = this.view.htmlSize(root);
              this.layout.compute(root.children, root.coord, htmlSize);
  
              this.setColors(root.children);
              this.view.render(root, rootWrap);
          }
      }
  
      /*
      for (let i = 0; i < items.length; i++) {
          items[i].load();
      }*/
  
      if (node) {
          this.trigger(DATA_BOUND, { node: node });
      }
    }
  
    private cleanItems(): void {
      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
    }
  
    private setColors(items: any[]): void {
      const colors = colorsByLength(this.options.minColor, this.options.maxColor, items.length);
      items.forEach((item, idx) => {
        item.color = colors[idx];
      });
    }
  
    private wrapItem(item: any): TreeNode {
      const wrapped: TreeNode = {
        text: item.name,
        dataItem: item,
        value: this.getField(this.options.valueField, item),
        color: '',
        coord: {
          top: 0,
          left: 0,
          width: 0,
          height: 0
        }
      };
  
      if (item.hasChildren) {
        wrapped.children = item.children.map((child: any) => this.wrapItem(child));
      }
  
      return wrapped;
    }
  
    dataItem(node: any): any {
      const uid = node.getAttribute('data-uid');
      return this.getByUid(uid);
    }
  
    private getByUid(uid: string): any {
      return this.dataSource.getByUid(uid);
    }
  
    findByUid(uid: string): any {
      const items = this.items();
      return items.find(item => item.getAttribute('data-uid') === uid);
    }
  
    items(): any[] {
      return Array.from(this.element.querySelectorAll('.k-leaf'));
    }
  
    getSize(): { width: number; height: number } {
      return {
        width: this.element.clientWidth,
        height: this.element.clientHeight
      };
    }
  
    resize(): void {
      if (this.root) {
        
        let rootElement: HTMLElement = this.element.children[0] as HTMLElement;
        this.root.coord.width = this.element.clientWidth;
        this.root.coord.height = this.element.clientHeight;
        rootElement.style.width = `${this.root.coord.width}px`;
        rootElement.style.height = `${this.root.coord.height}px`;
        this.resizeItems(this.root, rootElement);
      }
    }
  
    private resizeItems(root: any, element: HTMLElement): void {
      if (root.children && root.children.length) {
        const elements = element.querySelectorAll('.k-treemap-wrap > div');
        this.layout.compute(root.children, root.coord, { text: this.view.titleSize(root, element) });
        root.children.forEach((child: any, idx: number) => {
          const childElement: HTMLElement  = elements[idx] as HTMLElement;
          this.view.setItemSize(child, childElement);
          this.resizeItems(child, childElement);
        });
      }
    }
  
    setOptions(options: any): void {
      const dataSource = options.dataSource;
      options.dataSource = undefined;
      this.options = { ...this.options, ...options };
      this.setLayout();
      this.initTheme(this.options);
  
      if (dataSource) {
        this.setDataSource(HierarchicalDataSource.create(dataSource));
      }
  
      if (this.options.autoBind) {
        this.dataSource.fetch();
      }
    }
  
    private initTheme(options: any): void {
      const themes = { default: {} }; // Dummy theme object; replace with actual theme handling
      const themeName = (options.theme || "").toLowerCase();
      const themeOptions = themes[themeName]?.treeMap || {};
  
      this.options = { ...themeOptions, ...options };
    }
  
    setDataSource(dataSource: any): void {
      this.dataSource = dataSource;
      if (this.options.autoBind) {
        this.dataSource.fetch();
      }
    }
  
    private mouseover(event: Event): void {
      const target = event.target as HTMLElement;
      if (target.classList.contains('k-leaf')) {
        this.removeActiveState();
        target.classList.add('k-hover');
      }
    }
  
    private mouseleave(): void {
      this.removeActiveState();
    }
  
    private removeActiveState(): void {
      const hoveredElements = this.element.querySelectorAll('.k-hover');
      hoveredElements.forEach(el => el.classList.remove('k-hover'));
    }
  
    private trigger(eventType: string, args: any): void {
      const event = new CustomEvent(eventType, { detail: args });
      this.element.dispatchEvent(event);
    }

    private getField(field: string, row: any): any {
      if (row === null) {
        return row;
      }
    
      const get = new Function('obj', `return obj.${field}`);
      return get(row);
    }
  
    private sortForGrouping(items: any[], field: string, direction: string): any[] {
      return items.sort((a: any, b: any) => {
        const aValue = this.getField(field, a);
        const bValue = this.getField(field, b);
        if (direction === "desc") {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    }
  }