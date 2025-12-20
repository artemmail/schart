import { TreeNode, HtmlSize } from './tree-layout.interface';
import { SquarifiedView } from './SquarifiedView';




function getInnerWidth(element: HTMLElement): number {
  if (element) {
    const computedStyle = getComputedStyle(element);
    const width = element.clientWidth;
    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingRight = parseFloat(computedStyle.paddingRight);
    return width - paddingLeft - paddingRight;
  }
  return 0;
}

function getOuterWidth(element: HTMLElement): number {
  if (element) {
    return element.offsetWidth;
  }
  return 0;
}


export class SliceAndDiceView extends SquarifiedView {

  constructor(treeMap: any, options: any) {
    super(treeMap, options);
  }
    
  override htmlSize(root: TreeNode): HtmlSize {
    const rootElement = this._getByUid(root.dataItem.uid);
    const htmlSize: HtmlSize = {
      text: 0,
      offset: 0
    };

    if (root.children) {
      this._clean(rootElement);

      const text = this._getText(root);
      if (text) {
        const title = this._createTitle(root);
        rootElement.append(title);
        this._compile(title, root.dataItem);

        if (root.vertical) {
          htmlSize.text = title.clientHeight; // Fixed: Used clientHeight instead of height()
        } else {
          htmlSize.text = title.clientWidth; // Fixed: Used clientWidth instead of width()
        }
      }

      rootElement.append(this._createWrap());

      htmlSize.offset = (getOuterWidth(rootElement) - getInnerWidth(rootElement)) / 2;
    }

    return htmlSize;
  }

  override titleSize(item: TreeNode, element: HTMLElement): number {
    let size = 0;
    if (item.vertical) {
      size = element.querySelector('.k-treemap-title')?.clientHeight || 0; // Fixed: Used querySelector and clientHeight
    } else {
      size = element.querySelector('.k-treemap-title-vertical')?.clientWidth || 0; // Fixed: Used querySelector and clientWidth
    }
    return size;
  }

  override _createTitle(item: TreeNode): HTMLElement {
    const title = document.createElement('div');
    if (item.vertical) {
      title.className = 'k-treemap-title';
    } else {
      title.className = 'k-treemap-title-vertical';
    }

    const innerDiv = document.createElement('div');
    innerDiv.innerHTML = this._getText(item);
    title.appendChild(innerDiv);

    return title;
  }

  override _getText(item: TreeNode): string {
    return item.dataItem.title || '';
  }

  override _clean(element: HTMLElement): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  override _createWrap(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    return wrap;
  }

  override _getByUid(uid: string): HTMLElement {
    return document.querySelector(`[data-uid="${uid}"]`) as HTMLElement;    
  }
}
