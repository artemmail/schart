import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintParameters } from 'src/app/models/Params';
import {
  FootprintRenderCommand,
  FootprintRenderer,
  FootprintSnapshot,
} from './footprint-render.types';
import { FootprintUpdateEvent } from './footprint-data.types';
import { ClusterData } from './clusterData';

interface FootprintDataStreams {
  data$: Observable<ClusterData | null>;
  updates$: Observable<FootprintUpdateEvent>;
  params$: Observable<FootPrintParameters | null>;
  settings$: Observable<ChartSettings | null>;
}

@Injectable()
export class FootprintRenderOrchestratorService implements OnDestroy {
  private subscriptions = new Subscription();
  private renderQueue: FootprintRenderCommand[] = [];
  private renderer?: FootprintRenderer;

  private latestParams: FootPrintParameters | null = null;
  private latestSettings: ChartSettings | null = null;

  ngOnDestroy(): void {
    this.destroy();
  }

  connectRenderer(renderer: FootprintRenderer | undefined) {
    this.renderer = renderer;
    this.flushQueue();
  }

  bindDataSources(streams: FootprintDataStreams) {
    this.subscriptions.add(
      streams.params$.subscribe((params) => {
        this.latestParams = params;
      })
    );

    this.subscriptions.add(
      streams.settings$.subscribe((settings) => {
        if (!settings) return;
        this.latestSettings = settings;
        this.enqueue({
          type: 'settings',
          settings,
          params: this.latestParams ?? undefined,
        });
      })
    );

    this.subscriptions.add(
      streams.data$.subscribe((data) => {
        if (!data || !this.latestParams || !this.latestSettings) {
          return;
        }

        const snapshot: FootprintSnapshot = {
          data,
          params: this.latestParams,
          settings: this.latestSettings,
        };
        this.enqueue({ type: 'snapshot', snapshot });
      })
    );

    this.subscriptions.add(
      streams.updates$.subscribe((delta) => {
        this.enqueue({ type: 'delta', delta });
      })
    );
  }

  destroy() {
    this.subscriptions.unsubscribe();
    this.renderQueue = [];
    this.renderer = undefined;
    this.latestParams = null;
    this.latestSettings = null;
  }

  private enqueue(command: FootprintRenderCommand) {
    this.renderQueue.push(command);
    this.flushQueue();
  }

  private flushQueue() {
    if (!this.renderer) {
      return;
    }

    while (this.renderQueue.length) {
      const command = this.renderQueue.shift();
      if (command) {
        this.renderer.applyRenderCommand(command);
      }
    }
  }
}
