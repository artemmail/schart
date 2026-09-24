import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import createDOMPurify, { Config, DOMPurify } from 'dompurify';

// Shared policy for rich text, Markdown/KaTeX and generated report tables.
// Do not enable USE_PROFILES here: it overrides the explicit tag allowlist.
const HTML_POLICY: Config = {
  ALLOWED_TAGS: [
    'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup',
    'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p',
    'pre', 's', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table',
    'tbody', 'td', 'th', 'thead', 'tfoot', 'tr', 'u', 'ul',
    // KaTeX accessibility markup and the SVG paths used for radicals/arrows.
    'math', 'semantics', 'annotation', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mtext',
    'mspace', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot', 'mstyle',
    'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'menclose',
    'mpadded', 'mphantom', 'mmultiscripts', 'mprescripts', 'none',
    'svg', 'path', 'line',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
    'width', 'height', 'colspan', 'rowspan', 'scope', 'start', 'reversed',
    'dir', 'lang', 'open', 'aria-hidden', 'aria-label',
    'data-year', 'data-month',
    'xmlns', 'display', 'encoding', 'mathvariant', 'mathsize', 'mathcolor',
    'mathbackground', 'scriptlevel', 'displaystyle', 'stretchy', 'fence',
    'separator', 'accent', 'accentunder', 'lspace', 'rspace', 'minsize',
    'maxsize', 'linethickness', 'columnalign', 'columnspacing', 'rowspacing',
    'rowalign', 'columnlines', 'rowlines', 'align', 'notation', 'depth',
    'voffset', 'viewbox', 'preserveaspectratio', 'd', 'x1', 'x2', 'y1', 'y2',
    'stroke', 'stroke-width', 'fill',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  RETURN_TRUSTED_TYPE: false,
};

// DOMPurify sanitizes markup, not CSS. Retain only presentational properties
// and simple values; no URLs, CSS escapes, variables, positioning or functions
// other than numeric colors. KaTeX needs dimensions, spacing and offsets.
const STYLE_PROPERTIES = new Set([
  'background-color', 'border', 'border-color', 'border-style', 'border-width',
  ...['top', 'bottom', 'left', 'right'].flatMap(side =>
    ['width', 'style', 'color'].map(property => `border-${side}-${property}`)
  ),
  'border-collapse', 'color',
  'font-family', 'font-size', 'font-style', 'font-weight', 'line-height',
  'text-align', 'text-decoration', 'text-decoration-line', 'text-decoration-color',
  'text-decoration-style', 'text-decoration-thickness', 'vertical-align', 'white-space',
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'top', 'bottom', 'left', 'right',
]);
const STYLE_VALUE = /^(?:[-\w\s.%#,]|(?:rgb|hsl)a?\([\d\s.,%+\-/]+\))+$/i;

@Injectable({ providedIn: 'root' })
export class SafeHtmlService {
  private readonly purifier: DOMPurify;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly angularSanitizer: DomSanitizer
  ) {
    // A dedicated instance prevents hooks/configuration from leaking to callers.
    this.purifier = createDOMPurify(document.defaultView ?? undefined);
    if (!this.purifier.isSupported) {
      return;
    }
    this.purifier.addHook('uponSanitizeAttribute', (node, attribute) => {
      if (attribute.attrName === 'style') {
        attribute.attrValue = this.sanitizeStyle(attribute.attrValue);
        attribute.keepAttr = attribute.attrValue.length > 0;
      }
      if (attribute.attrName === 'href' || attribute.attrName === 'src') {
        attribute.keepAttr = this.isAllowedUrl(
          node.nodeName.toLowerCase(), attribute.attrName, attribute.attrValue
        );
      }
      if (attribute.attrName === 'target') {
        attribute.keepAttr = ['_blank', '_self'].includes(attribute.attrValue);
      }
      if (attribute.attrName === 'fill' || attribute.attrName === 'stroke') {
        attribute.keepAttr = STYLE_VALUE.test(attribute.attrValue);
      }
    });
    this.purifier.addHook('afterSanitizeAttributes', (node) => {
      if (node.nodeName.toLowerCase() === 'a' && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  sanitize(html: string | null | undefined): string {
    // Unsupported DOM environments must never return the original input.
    if (!this.purifier.isSupported) {
      return '';
    }
    return this.purifier.sanitize(html ?? '', HTML_POLICY);
  }

  sanitizeForBinding(html: string | null | undefined): SafeHtml {
    // The only trust boundary: sanitize first, then preserve the allowed
    // inline styles/MathML/SVG that Angular's HTML sanitizer would remove.
    return this.angularSanitizer.bypassSecurityTrustHtml(this.sanitize(html));
  }

  private sanitizeStyle(value: string): string {
    const source = this.document.createElement('span').style;
    const clean = this.document.createElement('span').style;
    source.cssText = value;
    for (let index = 0; index < source.length; index += 1) {
      const property = source.item(index);
      const propertyValue = source.getPropertyValue(property).trim();
      if (STYLE_PROPERTIES.has(property) && STYLE_VALUE.test(propertyValue)) {
        clean.setProperty(property, propertyValue);
      }
    }
    return clean.cssText;
  }

  private isAllowedUrl(tag: string, attribute: string, value: string): boolean {
    if (!((tag === 'a' && attribute === 'href') || (tag === 'img' && attribute === 'src'))) {
      return false;
    }
    const url = value.trim();
    // Pasted raster images are supported; SVG/HTML data URLs are not.
    if (tag === 'img' && /^data:image\/(?:png|gif|jpeg|webp|avif);base64,[a-z\d+/]+=*$/i.test(url)) {
      return true;
    }
    if (/[\u0000-\u0020\u007f]/.test(url)) {
      return false;
    }
    try {
      const protocol = new URL(url, 'https://sanitizer.invalid/').protocol;
      return ['http:', 'https:'].includes(protocol) ||
        (tag === 'a' && ['mailto:', 'tel:'].includes(protocol));
    } catch {
      return false;
    }
  }
}
