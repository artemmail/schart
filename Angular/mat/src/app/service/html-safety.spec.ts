import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SafeHtml } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmDialogComponent } from '../components/Dialogs/confirm-dialog/confirm-dialog.component';
import { InformationDialogComponent } from '../components/Dialogs/information-dialog/information-dialog.component';
import { TopicListComponent } from '../components/tables/topic-list/topic-list.component';
import { ServiceNewsDetailsComponent } from '../components/pages/service-news-details/service-news-details.component';
import { SeasonalityComponent } from '../components/Reports/seasonality/seasonality.component';
import { ColorSchemeService } from '../services/theme/color-scheme.service';
import { SafeHtmlService } from './safe-html.service';
import { MarkdownRendererService } from './markdown-renderer.service';
import { AuthService } from './auth.service';
import { NewsService } from './news.service';
import { ReportsService } from './reports.service';
import { DialogService } from './DialogService.service';

@Component({
  standalone: true,
  template: '<div class="rendered-content" [innerHTML]="html"></div>',
})
class HtmlHostComponent {
  html: SafeHtml | string = '';
}

function expectInertContent(root: HTMLElement): void {
  expect(root.querySelector(
    'script, style, iframe, object, embed, form, input, textarea, button, link, meta, base, ' +
    'template, foreignObject, animate, set, use, annotation-xml'
  )).toBeNull();
  for (const element of Array.from(root.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      expect(attribute.name).not.toMatch(/^on|^srcdoc$/i);
      if (attribute.name === 'href' || attribute.name === 'src') {
        expect(attribute.value).not.toMatch(/^\s*(?:javascript|vbscript|data:text|data:image\/svg)/i);
      }
    }
  }
}

describe('HTML safety in browser bindings', () => {
  let fixture: ComponentFixture<HtmlHostComponent>;
  let safeHtml: SafeHtmlService;
  let markdown: MarkdownRendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HtmlHostComponent] });
    safeHtml = TestBed.inject(SafeHtmlService);
    markdown = TestBed.inject(MarkdownRendererService);
    fixture = TestBed.createComponent(HtmlHostComponent);
  });

  function render(html: SafeHtml): HTMLElement {
    fixture.componentInstance.html = html;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.rendered-content');
  }

  const attacks: Record<string, string> = {
    'scripts and image handlers': '<script>alert(1)</script><img src="/missing.png" onerror="alert(1)"><b>OK</b>',
    'SVG handlers and embedded HTML': '<svg onload="alert(1)"><foreignObject><p onclick="alert(1)">X</p></foreignObject><script>alert(1)</script></svg>',
    'SVG animation and references': '<svg><a href="javascript:alert(1)">X</a><use href="/image.svg#x"></use><animate attributeName="href" values="javascript:alert(1)"></animate><path fill="url(https://example.invalid/a)" d="M0 0"></path></svg>',
    'embedded documents': '<iframe srcdoc="<script>alert(1)</script>"></iframe><object data="javascript:alert(1)"></object><embed src="/evil.html">',
    'forms and DOM clobbering': '<form id="location"><input name="href" value="javascript:alert(1)"></form><a id="document" name="cookie">text</a>',
    'document configuration': '<base href="https://example.invalid"><meta http-equiv="refresh" content="0;url=javascript:alert(1)"><link rel="stylesheet" href="/bad.css"><style>body{display:none}</style>',
    'templates and custom elements': '<template><img src="x" onerror="alert(1)"></template><evil-widget onclick="alert(1)">text</evil-widget>',
    'malformed table markup': '<table><tr><td><img src=x onerror=alert(1)//></table>',
    'MathML namespace mutation': '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
    'MathML HTML integration': '<math><annotation-xml encoding="text/html"><img src=x onerror=alert(1)></annotation-xml></math>',
  };

  for (const [name, payload] of Object.entries(attacks)) {
    it(`removes ${name} before Angular inserts HTML`, () => {
      const root = render(safeHtml.sanitizeForBinding(payload));
      expectInertContent(root);
      expect(root.querySelector('[id], [name]')).toBeNull();
    });
  }

  for (const url of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'jav&#x61;script:alert(1)',
    'java&#9;script:alert(1)', '&#10;javascript:alert(1)', 'vbscript:msgbox(1)',
    'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=',
    'file:///C:/secret.txt', 'blob:https://example.invalid/123',
  ]) {
    it(`rejects the URL ${url}`, () => {
      const root = render(safeHtml.sanitizeForBinding(`<a href="${url}">link</a><img src="${url}">`));
      expect(root.querySelector('a')?.hasAttribute('href')).toBeFalse();
      expect(root.querySelector('img')?.hasAttribute('src')).toBeFalse();
    });
  }

  it('retains formatted text, tables, safe links and raster images', () => {
    const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7WQAAAAASUVORK5CYII=';
    const root = render(safeHtml.sanitizeForBinding(
      '<h2>Heading</h2><p><strong>Bold</strong> <em>Italic</em></p><ul><li>Item</li></ul>' +
      '<table><tr><th>Year</th><td colspan="2">2026</td></tr></table>' +
      '<a href="/Payment?plan=1&amp;months=3" target="_blank" rel="opener">Pay</a>' +
      '<a href="https://example.com">Web</a><a href="mailto:help@example.com">Mail</a>' +
      `<img src="${image}" alt="Chart" width="100">`
    ));
    expect(root.querySelector('h2')?.textContent).toBe('Heading');
    expect(root.querySelector('strong')?.textContent).toBe('Bold');
    expect(root.querySelector('li')?.textContent).toBe('Item');
    expect(root.querySelector('td')?.getAttribute('colspan')).toBe('2');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/Payment?plan=1&months=3');
    expect(root.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(root.querySelector('a[href="https://example.com"]')).not.toBeNull();
    expect(root.querySelector('a[href="mailto:help@example.com"]')).not.toBeNull();
    expect(root.querySelector('img')?.getAttribute('src')).toBe(image);
  });

  it('filters CSS without losing text formatting and chart colors', () => {
    const root = render(safeHtml.sanitizeForBinding(
      '<p style="color: red; text-align: center; background-color: rgba(0, 128, 0, 0.5); ' +
      'width: 74px; border: 1px solid rgb(20, 30, 40); position: fixed; z-index: 999999; background-image: url(/tracking); ' +
      '--payload: url(/tracking); height: var(--size); cursor: url(/tracking), auto" ' +
      'data-payload="danger" data-year="2026" data-month="9">Cell</p>'
    ));
    const paragraph = root.querySelector('p')!;
    expect(paragraph.style.color).toBe('red');
    expect(paragraph.style.textAlign).toBe('center');
    expect(paragraph.style.backgroundColor).toBe('rgba(0, 128, 0, 0.5)');
    expect(paragraph.style.width).toBe('74px');
    expect(paragraph.style.borderTopColor).toBe('rgb(20, 30, 40)');
    expect(paragraph.style.borderTopWidth).toBe('1px');
    expect(paragraph.style.borderTopStyle).toBe('solid');
    expect(paragraph.getAttribute('style')).not.toMatch(/url|var\(|position|z-index|--payload|cursor/i);
    expect(paragraph.hasAttribute('data-payload')).toBeFalse();
    expect(paragraph.dataset['year']).toBe('2026');
    expect(paragraph.dataset['month']).toBe('9');
  });

  it('handles empty and missing HTML', () => {
    for (const value of ['', null, undefined]) {
      expect(safeHtml.sanitize(value)).toBe('');
      expect(render(safeHtml.sanitizeForBinding(value)).innerHTML).toBe('');
    }
  });

  it('sanitizes the final Markdown output while retaining headings, tables and code', () => {
    const root = render(markdown.renderMath(
      '# Heading\n\n**bold** [bad](javascript:alert%281%29)\n\n' +
      '| A | B |\n| --- | --- |\n| 1 | 2 |\n\n' +
      '<img src=x onerror=alert(1)><svg onload=alert(1)></svg>\n\n' +
      '```html\n<script>alert(1)</script>\n```'
    ));
    expectInertContent(root);
    expect(root.querySelector('h1')?.textContent).toBe('Heading');
    expect(root.querySelector('table')).not.toBeNull();
    expect(root.querySelector('pre code')?.textContent).toContain('<script>alert(1)</script>');
    expect(root.querySelector('a')?.hasAttribute('href')).toBeFalse();
  });

  for (const equation of [
    '$x^2$', '$$\\frac{a}{b}$$', '\\(\\sqrt{x}\\)',
    '\\[\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}\\]',
  ]) {
    it(`preserves KaTeX HTML, MathML and layout for ${equation}`, () => {
      const root = render(markdown.renderMath(equation));
      expectInertContent(root);
      expect(root.querySelector('.katex .katex-html')).not.toBeNull();
      expect(root.querySelector('.katex math semantics')).not.toBeNull();
      expect(root.querySelector('.katex [style*="height"]')).not.toBeNull();
      if (equation.includes('sqrt')) {
        expect(root.querySelector('.katex svg path')?.getAttribute('d')).toBeTruthy();
      }
    });
  }

  it('does not trust HTML commands, links or invalid equations in KaTeX', () => {
    const root = render(markdown.renderMath(
      '$$\\href{javascript:alert(1)}{click}$$\n\n' +
      '$$\\includegraphics{https://example.invalid/tracker}$$\n\n' +
      '$$\\frac{<img src=x onerror=alert(1)>$$'
    ));
    expectInertContent(root);
    expect(root.querySelector('a, img')).toBeNull();
    expect(root.querySelector('.katex-error')).not.toBeNull();
  });

  it('keeps chart fences separate from sanitized Markdown', () => {
    const blocks = markdown.extractBlocks('**Chart**\n\n```bar\n{"data":[{"name":"A","value":1}]}\n```\nAfter');
    expect(blocks.map(block => block.type)).toEqual(['markdown', 'chart', 'markdown']);
  });
});

describe('Dialog text safety', () => {
  const message = '<img src=x onerror=alert(1)>\n<b>Server error</b>';
  const dialogRef = { close: jasmine.createSpy('close') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, InformationDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { message } },
      ],
    });
    dialogRef.close.calls.reset();
  });

  it('renders confirmation messages as literal text and preserves the result', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toBe(message);
    expect(fixture.nativeElement.querySelector('img, b')).toBeNull();
    fixture.componentInstance.onYesClick();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    fixture.componentInstance.onNoClick();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('renders informational messages as literal text', () => {
    const fixture = TestBed.createComponent(InformationDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p').textContent).toBe(message);
    expect(fixture.nativeElement.querySelector('img, b, a')).toBeNull();
  });

  it('renders a structured subscription link through Angular URL binding', () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: { message, link: { url: '/Payment', label: 'Перейти к тарифам' } },
    });
    const fixture = TestBed.createComponent(InformationDialogComponent);
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('/Payment');
    expect(link.textContent).toBe('Перейти к тарифам');
    fixture.componentInstance.data.link = { url: 'javascript:alert(1)', label: '<img src=x>' };
    fixture.detectChanges();
    expect(link.getAttribute('href')).toBe('unsafe:javascript:alert(1)');
    expect(link.querySelector('img')).toBeNull();
  });
});

describe('Server HTML consumers', () => {
  const text = '<p><strong>Article</strong><img src=x onerror=alert(1)></p><script>alert(1)</script>';
  const user = { Id: '1', UserName: 'author' };
  const comment = { Id: 2, TopicId: 1, Text: '<em>Comment</em><svg onload=alert(1)></svg>', Date: new Date(), User: user };
  const topic = { Id: 1, Header: 'News', Text: text, Date: new Date(), TopicUser: user, UserComments: [comment] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HtmlHostComponent, TopicListComponent, ServiceNewsDetailsComponent, SeasonalityComponent],
      providers: [
        provideRouter([]), provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { params: of({ id: 'news' }) } },
        { provide: AuthService, useValue: { isAuthenticated: () => false, isAdmin: () => false } },
        { provide: NewsService, useValue: {
          getUserTopics2: () => of({ Items: [{ ...topic, Author: 'author', Slug: 'news' }] }),
          getTopicBySlug: () => of(topic),
        } },
        { provide: DialogService, useValue: {} },
        { provide: ReportsService, useValue: {} },
        { provide: ColorSchemeService, useValue: {} },
      ],
    });
  });

  it('sanitizes API articles before rendering the topic list', () => {
    const fixture = TestBed.createComponent(TopicListComponent);
    fixture.detectChanges();
    const content: HTMLElement = fixture.nativeElement.querySelector('.content');
    expectInertContent(content);
    expect(content.querySelector('strong')?.textContent).toBe('Article');
  });

  it('sanitizes both the article and rich text comments on the details page', () => {
    const fixture = TestBed.createComponent(ServiceNewsDetailsComponent);
    fixture.detectChanges();
    const contents: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.content'));
    expect(contents.length).toBe(2);
    contents.forEach(expectInertContent);
    expect(contents[0].querySelector('strong')?.textContent).toBe('Article');
    expect(contents[1].querySelector('em')?.textContent).toBe('Comment');
  });

  it('keeps seasonality colors and tooltip metadata while sanitizing API labels', () => {
    const report = TestBed.createComponent(SeasonalityComponent);
    const host = TestBed.createComponent(HtmlHostComponent);
    host.componentInstance.html = report.componentInstance.buildChart([
      ['Year<script>alert(1)</script>', 'янв'],
      [2026, 125],
    ]);
    host.detectChanges();
    const content: HTMLElement = host.nativeElement.querySelector('.rendered-content');
    expectInertContent(content);
    const cell = content.querySelector<HTMLElement>('td[data-year="2026"][data-month="1"]');
    expect(cell).not.toBeNull();
    expect(cell?.textContent).toBe('1.25%');
    expect(cell?.style.backgroundColor).toBeTruthy();
    expect(cell?.style.borderTopWidth).toBe('1px');
    expect(cell?.style.borderTopStyle).toBe('solid');
    expect(cell?.querySelector('div')?.style.width).toBe('74px');
  });
});
