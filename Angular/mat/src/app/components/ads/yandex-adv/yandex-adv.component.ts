import { AfterViewInit, Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const YANDEX_BLOCK_ID = 'R-A-16712414-1';
const YANDEX_RENDER_TO = 'yandex_rtb_R-A-16712414-1';
const YANDEX_SCRIPT_SRC = 'https://yandex.ru/ads/system/context.js';

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
  private fallbackTimer: number | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.ensureLoaderScript();
    this.queueRender();
    this.startFallbackRender();
  }

  private ensureLoaderScript(): void {
    // If the loader is blocked by extensions/CSP, ads won't render; this only ensures it is requested.
    const alreadyAdded = Array.from(document.scripts).some(
      (s) => s.src === YANDEX_SCRIPT_SRC
    );
    if (alreadyAdded) {
      return;
    }

    const script = document.createElement('script');
    script.src = YANDEX_SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.warn(
        '[YandexAdv] Failed to load RTB script. It may be blocked by AdBlock/CSP.'
      );
    };
    document.head.appendChild(script);
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

  private startFallbackRender(): void {
    // If context.js loads after our callback push, it should flush yaContextCb itself.
    // This fallback covers edge cases when flush doesn't happen (timing quirks) by retrying.
    if (this.fallbackTimer !== null) {
      return;
    }

    const tryRender = () => {
      const w = window as Window;
      const canRender = !!w.Ya?.Context?.AdvManager?.render;
      if (!canRender) {
        return;
      }

      try {
        w.Ya?.Context?.AdvManager?.render({
          blockId: YANDEX_BLOCK_ID,
          renderTo: YANDEX_RENDER_TO,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[YandexAdv] RTB render failed', e);
      } finally {
        if (this.fallbackTimer !== null) {
          window.clearInterval(this.fallbackTimer);
          this.fallbackTimer = null;
        }
      }
    };

    this.fallbackTimer = window.setInterval(tryRender, 500);
    window.setTimeout(() => {
      if (this.fallbackTimer !== null) {
        window.clearInterval(this.fallbackTimer);
        this.fallbackTimer = null;
      }
    }, 15000);
  }
}
