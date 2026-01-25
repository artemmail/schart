import { AfterViewInit, Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const YANDEX_BLOCK_ID = 'R-A-16712414-1';
const YANDEX_RENDER_TO = 'yandex_rtb_R-A-16712414-1';

declare global {
  interface Window {
    yaContextCb?: Array<() => void>;
    Ya?: {
      Context?: {
        AdvManager?: {
          render: (options: { blockId: string; renderTo: string }) => void;
        };
      };
    };
  }
}

@Component({
  standalone: true,
  selector: 'app-yandex-adv',
  templateUrl: './yandex-adv.component.html',
  styleUrls: ['./yandex-adv.component.scss'],
})
export class YandexAdvComponent implements AfterViewInit {
  private hasRendered = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.queueRender();
  }

  private queueRender(): void {
    if (this.hasRendered) {
      return;
    }

    const w = window as Window;
    w.yaContextCb = w.yaContextCb || [];
    w.yaContextCb.push(() => {
      w.Ya?.Context?.AdvManager?.render({
        blockId: YANDEX_BLOCK_ID,
        renderTo: YANDEX_RENDER_TO,
      });
    });

    this.hasRendered = true;
  }
}
