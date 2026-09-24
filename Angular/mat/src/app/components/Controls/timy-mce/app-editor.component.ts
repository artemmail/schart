import { Component, Input, OnDestroy, forwardRef, AfterViewInit, Renderer2, ElementRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import '../../../../assets/tinymce/tinymce.min';
import '../../../../assets/tinymce/themes/silver/theme.min';
import '../../../../assets/tinymce/icons/default/icons.min';
import '../../../../assets/tinymce/plugins/link/plugin.min';
import '../../../../assets/tinymce/plugins/table/plugin.min';
import '../../../../assets/tinymce/plugins/accordion/plugin.min';
import '../../../../assets/tinymce/plugins/advlist/plugin.min';
import '../../../../assets/tinymce/plugins/anchor/plugin.min';
import '../../../../assets/tinymce/plugins/autolink/plugin.min';
import '../../../../assets/tinymce/plugins/autoresize/plugin.min';
import '../../../../assets/tinymce/plugins/autosave/plugin.min';
import '../../../../assets/tinymce/plugins/charmap/plugin.min';
import '../../../../assets/tinymce/plugins/code/plugin.min';
import '../../../../assets/tinymce/plugins/codesample/plugin.min';
import '../../../../assets/tinymce/plugins/directionality/plugin.min';
import '../../../../assets/tinymce/plugins/emoticons/plugin.min';
import '../../../../assets/tinymce/plugins/fullscreen/plugin.min';
import '../../../../assets/tinymce/plugins/help/plugin.min';
import '../../../../assets/tinymce/plugins/image/plugin.min';
import '../../../../assets/tinymce/plugins/importcss/plugin.min';
import '../../../../assets/tinymce/plugins/insertdatetime/plugin.min';
import '../../../../assets/tinymce/plugins/lists/plugin.min';
import '../../../../assets/tinymce/plugins/media/plugin.min';
import '../../../../assets/tinymce/plugins/nonbreaking/plugin.min';
import '../../../../assets/tinymce/plugins/pagebreak/plugin.min';
import '../../../../assets/tinymce/plugins/preview/plugin.min';
import '../../../../assets/tinymce/plugins/quickbars/plugin.min';
import '../../../../assets/tinymce/plugins/save/plugin.min';
import '../../../../assets/tinymce/plugins/searchreplace/plugin.min';
import '../../../../assets/tinymce/plugins/visualblocks/plugin.min';
import '../../../../assets/tinymce/plugins/visualchars/plugin.min';
import '../../../../assets/tinymce/plugins/wordcount/plugin.min';

declare const tinymce: any;

@Component({
  standalone: true,
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
