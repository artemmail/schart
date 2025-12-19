export interface TreeNode {
    value: number;
    area?: number;
    coord?: Coord;
    children?: TreeNode[];
    level?: number;
    vertical?: boolean;
  }
  
  export interface Coord {
    width: number;
    height: number;
    top: number;
    left: number;
    dim?: number;
  }
  
  export interface TreeLayout {
    createRoot(root: TreeNode, width: number, height: number, vertical?: boolean): void;
    compute(children: TreeNode[], rootCoord: Coord, htmlSize: { text: number }): void;
    layoutChildren(items: TreeNode[], coord: Coord): void;
  }

  export interface TreeNode {
    value: number;
    area?: number;
    coord?: Coord;
    children?: TreeNode[];
    level?: number;
    vertical?: boolean;
    dataItem?: any;
    text? : string;
    color? : string;
  }
  
  export interface Coord {
    width: number;
    height: number;
    top: number;
    left: number;
    dim?: number;
  }
  
  export interface HtmlSize {
    text: number;
    offset: number;
  }
  
  export interface TreeView {
    htmlSize(root: TreeNode): HtmlSize;
    titleSize(item: TreeNode, element: HTMLElement): number;
  }

  export interface Options {
    minColor?: string;
    maxColor?: string;
    type: string;
    colors: string[][];
    prefix: string;
    name: string;
    theme: string;
    autoBind: boolean;
    textField: string;
    valueField: string;
    colorField: string;
    dataSource: any;
  }