import { Component, Input, OnDestroy, forwardRef, AfterViewInit, Renderer2, ElementRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import 'tinymce/tinymce';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
import 'tinymce/plugins/link';
import 'tinymce/plugins/table';
import 'tinymce/plugins/accordion';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/autosave';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/code';
import 'tinymce/plugins/codesample';
import 'tinymce/plugins/directionality';
import 'tinymce/plugins/emoticons';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/help';
import 'tinymce/plugins/image';
import 'tinymce/plugins/importcss';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/media';
import 'tinymce/plugins/nonbreaking';
import 'tinymce/plugins/pagebreak';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/quickbars';
import 'tinymce/plugins/save';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/visualchars';
import 'tinymce/plugins/wordcount';

declare const tinymce: any;

@Component({
  selector: 'app-editor',
  template: `<textarea id="{{elementId}}"></textarea>`,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditorComponent),
      multi: true,
    },
  ],
})
export class EditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input() elementId: string = 'tinymce-editor';

  private editor: any;
  private onChange: (value: string) => void;
  private onTouched: () => void;
  private editorReady: Promise<void>;
  private editorReadyResolve: (value: void) => void;

  constructor(private renderer: Renderer2, private el: ElementRef) {
    this.editorReady = new Promise((resolve) => {
      this.editorReadyResolve = resolve;
    });
  }

  ngAfterViewInit(): void {
    // Инициализация редактора после полного рендеринга DOM
    tinymce.init({
      selector: `#${this.elementId}`,
      plugins: [
        'link', 'table', 'accordion', 'advlist', 'anchor', 'autolink', 'autoresize', 'autosave',
        'charmap', 'code', 'codesample', 'directionality', 'emoticons', 'fullscreen', 'help',
        'image', 'importcss', 'insertdatetime', 'lists', 'media', 'nonbreaking', 'pagebreak',
        'preview', 'quickbars', 'save', 'searchreplace', 'visualblocks', 'visualchars', 'wordcount'
      ],
      toolbar: 'bold italic | alignleft aligncenter alignright alignjustify | link image table media blockquote | bullist numlist outdent indent',    
      image_caption: true,
      image_advtab: true,
      base_url: '/assets/tinymce',
      suffix: '.min',
      content_css: [
        /* '/Content/main.css',
         '/Content/component-new-menu.css',
         '/Content/common.css',
         '/Content/whitebody.css',*/
      ],
      convert_urls: false,
      templates: [
        { title: 'Test template 1', content: 'Test 1' },
        { title: 'Test template 2', content: 'Test 2' }
      ],
      setup: (editor: any) => {
        this.editor = editor;

        editor.on('init', () => {
          this.editorReadyResolve(); // Резолвим промис после инициализации редактора

          const selectors = '.tox-promotion, .tox-statusbar__branding';
          const elements: NodeListOf<Element> = this.el.nativeElement.querySelectorAll(selectors);          
          elements.forEach(element => {
            const parent = element.parentNode;
            if (parent) {
              this.renderer.removeChild(parent, element);
            }
          });

          if (this.onChange) {
            this.onChange(editor.getContent());
          }
        });

        editor.on('change keyup', () => {
          const content = editor.getContent();
          this.onChange(content);
        });
      },
    });
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.remove();
    }
  }

  async writeValue(value: string): Promise<void> {
    // Ожидаем, пока редактор инициализируется
    await this.editorReady;
    if (this.editor) {
      this.editor.setContent(value || '');
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
