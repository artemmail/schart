import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintParameters } from 'src/app/models/Params';
import { FootprintInitOptions } from '../models/footprint-data.types';
import { FootprintDataLoaderService } from './footprint-data-loader.service';
import { FootprintRealtimeUpdaterService } from './footprint-realtime-updater.service';

/** One owner for user loads, recovery loads and the history/realtime handoff. */
@Injectable()
export class FootprintSessionService implements OnDestroy {
  private destroyed = false;
  private recoverySubscription: Subscription;
  readonly state$;
  readonly updates$;

  constructor(private loader: FootprintDataLoaderService, private realtime: FootprintRealtimeUpdaterService) {
    this.state$ = this.loader.state$;
    this.updates$ = this.realtime.updates$;
    this.recoverySubscription = realtime.recovery$.subscribe(event => { void this.recover(event.sessionId); });
  }

  initialize(params: FootPrintParameters, presetIndex: number, options: FootprintInitOptions): Promise<boolean> {
    return this.load(params, presetIndex, options, true);
  }

  reload(params: FootPrintParameters, presetIndex: number, options: FootprintInitOptions): Promise<boolean> {
    return this.load(params, presetIndex, options, false);
  }

  async recover(sessionId: number): Promise<boolean> {
    const snapshot = this.loader.snapshot;
    if (this.destroyed || !this.loader.isCurrentSession(sessionId) || snapshot?.sessionId !== sessionId) return false;
    return this.load(snapshot.params, snapshot.presetIndex, snapshot.options, false, snapshot.settings);
  }

  updateSettings(settings: ChartSettings, presetIndex?: number): void { this.loader.updateSettings(settings, presetIndex); }
  captureSettings(settings: ChartSettings): void { this.loader.captureSettings(settings); }

  clear(): void {
    const sessionId = this.loader.state.sessionId;
    this.loader.clear();
    void this.realtime.stopSession(sessionId);
  }

  async configureRealtime(params: FootPrintParameters, options: FootprintInitOptions): Promise<void> {
    const snapshot = this.loader.snapshot;
    if (!snapshot || JSON.stringify(snapshot.params) !== JSON.stringify(params) ||
        snapshot.options.minimode !== options.minimode || snapshot.options.deltamode !== options.deltamode) return;
    await this.realtime.configure(snapshot);
  }

  private async load(params: Readonly<FootPrintParameters>, presetIndex: number | undefined,
    options: Readonly<FootprintInitOptions>, loadPresets: boolean, settings?: ChartSettings): Promise<boolean> {
    if (this.destroyed) return false;
    const request = this.loader.beginSession(params, presetIndex, options, loadPresets, settings);
    if (!request || !this.loader.isCurrentSession(request.sessionId)) return false;
    this.realtime.beginSession(request.sessionId);
    const snapshot = await this.loader.loadSession(request, session => this.realtime.configure(session));
    const committed = snapshot ? this.realtime.commitSession(snapshot) : false;
    if (!committed) await this.realtime.stopSession(request.sessionId);
    return committed;
  }

  ngOnDestroy(): void { this.destroy(); }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.recoverySubscription.unsubscribe();
    this.realtime.destroy();
    this.loader.destroy();
  }
}
