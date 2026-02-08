import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject, filter, map } from 'rxjs';
import { environment } from 'src/app/environment';
import { ColumnEx } from 'src/app/models/Column';

export interface FootprintSubscribeParams {
  ticker: string;
  period: number;
  step: number;
}

export interface FootprintTickData {
  number: number;
  tradeDate: string | Date;
  price: number;
  quantity: number;
  direction: number;
  volume: number;
  oi: number;
}

export type FootprintLadderData = Record<string, number>;

export interface SignalRClusterEnvelope {
  key: string;
  data: ColumnEx[];
}

export interface SignalRTicksEnvelope {
  key: string;
  data: FootprintTickData[];
}

export interface SignalRLadderEnvelope {
  ticker: string;
  data: FootprintLadderData;
}

@Injectable({
  providedIn: 'root',
})
export class SignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection | undefined;
  private isConnecting: boolean = false;
  private isStopping: boolean = false;
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private readonly reconnectBaseDelayMs = 1000;
  private readonly reconnectMaxDelayMs = 30000;

  private activeSubscriptions = new Map<string, FootprintSubscribeParams>();
  private activeDirectLadderSubscriptions = new Map<string, string>();
  private activeLadderSubscriptions = new Map<string, number>();
  private ladderSubscriptionSequence = 0;

  private readonly serverEventNames = {
    clusterEnvelope: ['receiveClusterEnvelope', 'recieveClusterEnvelope'],
    ticksEnvelope: ['receiveTicksEnvelope', 'recieveTicksEnvelope'],
    ladderEnvelope: ['receiveLadderEnvelope', 'recieveLadderEnvelope'],
    clusterLegacy: ['receiveCluster', 'recieveCluster'],
    ticksLegacy: ['receiveTicks', 'recieveTicks'],
    ladderLegacy: ['receiveLadder', 'recieveLadder'],
  } as const;

  private receiveClusterEnvelopeSubject = new Subject<SignalRClusterEnvelope>();
  receiveClusterEnvelope$ = this.receiveClusterEnvelopeSubject.asObservable();

  private receiveTicksEnvelopeSubject = new Subject<SignalRTicksEnvelope>();
  receiveTicksEnvelope$ = this.receiveTicksEnvelopeSubject.asObservable();

  private receiveLadderEnvelopeSubject = new Subject<SignalRLadderEnvelope>();
  receiveLadderEnvelope$ = this.receiveLadderEnvelopeSubject.asObservable();

  private hasReceivedClusterEnvelope = false;
  private hasReceivedTicksEnvelope = false;
  private hasReceivedLadderEnvelope = false;

  private clusterEnvelopeHandler = (payload: SignalRClusterEnvelope) => {
    if (!payload || typeof payload.key !== 'string' || !Array.isArray(payload.data)) {
      console.warn('Skip receiveClusterEnvelope: invalid payload');
      return;
    }
    this.hasReceivedClusterEnvelope = true;
    this.receiveClusterEnvelopeSubject.next(payload);
  };

  private ticksEnvelopeHandler = (payload: SignalRTicksEnvelope) => {
    if (!payload || typeof payload.key !== 'string' || !Array.isArray(payload.data)) {
      console.warn('Skip receiveTicksEnvelope: invalid payload');
      return;
    }
    this.hasReceivedTicksEnvelope = true;
    this.receiveTicksEnvelopeSubject.next(payload);
  };

  private ladderEnvelopeHandler = (payload: SignalRLadderEnvelope) => {
    if (
      !payload ||
      typeof payload.ticker !== 'string' ||
      !payload.data ||
      typeof payload.data !== 'object'
    ) {
      console.warn('Skip receiveLadderEnvelope: invalid payload');
      return;
    }

    this.hasReceivedLadderEnvelope = true;
    this.receiveLadderEnvelopeSubject.next(payload);
  };

  private clusterLegacyHandler = (answ: ColumnEx[]) => {
    if (this.hasReceivedClusterEnvelope) {
      // Modern server sends envelope + legacy in parallel; envelope is authoritative.
      return;
    }

    const key = this.tryGetSingleActiveClusterHubKey();
    if (!key) {
      return;
    }

    this.receiveClusterEnvelopeSubject.next({ key, data: answ });
  };

  private ticksLegacyHandler = (answ: FootprintTickData[]) => {
    if (this.hasReceivedTicksEnvelope) {
      return;
    }

    const key = this.tryGetSingleActiveClusterHubKey();
    if (!key) {
      return;
    }

    this.receiveTicksEnvelopeSubject.next({ key, data: answ });
  };

  private ladderLegacyHandler = (ladder: FootprintLadderData) => {
    if (this.hasReceivedLadderEnvelope) {
      return;
    }

    if (!ladder) {
      console.warn('Skip receiveLadder: payload is null or undefined');
      return;
    }

    const ticker = this.tryGetSingleActiveLadderTicker();
    if (!ticker) {
      return;
    }

    this.receiveLadderEnvelopeSubject.next({ ticker, data: ladder });
  };

  constructor() {}

  public async startConnection(): Promise<void> {
    if (this.stopPromise) {
      await this.stopPromise;
    }

    if (
      this.hubConnection &&
      (this.hubConnection.state === signalR.HubConnectionState.Connected ||
        this.hubConnection.state === signalR.HubConnectionState.Connecting)
    ) {
      return this.startPromise ?? Promise.resolve();
    }

    if (this.isConnecting && this.startPromise) {
      return this.startPromise;
    }

    this.isConnecting = true;
    this.clearReconnectTimer();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/CandlesHub`, {
        withCredentials: true,
      })
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect()
      .build();
    this.hubConnection = connection;
    this.hasReceivedClusterEnvelope = false;
    this.hasReceivedTicksEnvelope = false;
    this.hasReceivedLadderEnvelope = false;

    connection.onclose(async (error) => {
      if (this.hubConnection !== connection) return;

      this.hubConnection = undefined;
      this.startPromise = null;
      console.log('SignalR connection closed');

      const hasSubscriptions = this.hasActiveSubscriptions();
      if (this.isStopping || !hasSubscriptions) return;

      console.warn('SignalR connection closed unexpectedly', error);
      this.reconnectAttempt = 0;
      this.scheduleReconnect('closed');
    });

    connection.onreconnecting(() => {
      if (this.hubConnection !== connection) return;
      console.warn('SignalR connection reconnecting...');
    });

    connection.onreconnected(async () => {
      if (this.hubConnection !== connection) return;
      console.log('SignalR connection reconnected');
      this.reconnectAttempt = 0;
      this.clearReconnectTimer();
      if (!this.isStopping) {
        await this.resubscribeAll();
      }
    });

    this.registerOnServerEvents();

    this.startPromise = connection
      .start()
      .then(() => {
        if (this.isStopping) {
          return Promise.reject('Connection start cancelled due to stop request');
        }
        console.log('SignalR connection started');
        this.reconnectAttempt = 0;
        return Promise.resolve();
      })
      .catch((err) => {
        console.warn('Error while starting SignalR connection: ' + err.toString());
        if (this.hubConnection === connection) {
          this.hubConnection = undefined;
        }
        this.startPromise = null;
        if (!this.isStopping && this.hasActiveSubscriptions()) {
          this.scheduleReconnect('start_failed');
        }
        throw err;
      })
      .finally(() => {
        this.isConnecting = false;
      });

    return this.startPromise;
  }

  private registerOnServerEvents(): void {
    if (!this.hubConnection) return;

    this.registerEventHandlers('clusterEnvelope', this.clusterEnvelopeHandler);
    this.registerEventHandlers('ticksEnvelope', this.ticksEnvelopeHandler);
    this.registerEventHandlers('ladderEnvelope', this.ladderEnvelopeHandler);
    this.registerEventHandlers('clusterLegacy', this.clusterLegacyHandler);
    this.registerEventHandlers('ticksLegacy', this.ticksLegacyHandler);
    this.registerEventHandlers('ladderLegacy', this.ladderLegacyHandler);
  }

  private registerEventHandlers(
    key: keyof typeof this.serverEventNames,
    handler: (payload: any) => void
  ) {
    if (!this.hubConnection) return;

    const [primary, ...aliases] = this.serverEventNames[key];
    this.hubConnection.on(primary, handler);
    aliases.forEach((alias) => {
      this.hubConnection!.on(alias, (payload) => {
        console.warn(
          `Received legacy SignalR event "${alias}". Please migrate to "${primary}".`
        );
        handler(payload);
      });
    });
  }

  private clearServerEvents(): void {
    if (!this.hubConnection) return;

    Object.values(this.serverEventNames).forEach((names) => {
      names.forEach((name) => this.hubConnection?.off(name));
    });
  }

  private buildSubscriptionKey(params: FootprintSubscribeParams): string {
    return `${params.ticker}:${params.period}:${params.step}`;
  }

  private buildHubClusterKey(params: FootprintSubscribeParams): string {
    const periodInSeconds = Math.round(params.period * 60);
    const step = Number(params.step);
    const stepText = Number.isFinite(step) ? step.toString() : '0';
    return `${params.ticker}_${periodInSeconds}_${stepText}`;
  }

  private getActiveClusterHubKeys(): string[] {
    return Array.from(
      new Set(
        Array.from(this.activeSubscriptions.values()).map((subscription) =>
          this.buildHubClusterKey(subscription)
        )
      )
    );
  }

  private tryGetSingleActiveClusterHubKey(): string | null {
    const keys = this.getActiveClusterHubKeys();
    return keys.length === 1 ? keys[0] : null;
  }

  private tryGetSingleActiveLadderTicker(): string | null {
    const tickers = Array.from(this.activeLadderSubscriptions.keys());
    return tickers.length === 1 ? tickers[0] : null;
  }

  public receiveClusterFor(
    params: FootprintSubscribeParams
  ): Observable<ColumnEx[]> {
    const key = this.buildHubClusterKey(params);
    return this.receiveClusterEnvelope$.pipe(
      filter((event) => event.key === key),
      map((event) => event.data)
    );
  }

  public receiveTicksFor(
    params: FootprintSubscribeParams
  ): Observable<FootprintTickData[]> {
    const key = this.buildHubClusterKey(params);
    return this.receiveTicksEnvelope$.pipe(
      filter((event) => event.key === key),
      map((event) => event.data)
    );
  }

  public receiveLadderFor(ticker: string): Observable<FootprintLadderData> {
    return this.receiveLadderEnvelope$.pipe(
      filter((event) => event.ticker === ticker),
      map((event) => event.data)
    );
  }

  private hasActiveSubscriptions(): boolean {
    return (
      this.activeSubscriptions.size > 0 ||
      this.activeDirectLadderSubscriptions.size > 0
    );
  }

  private getLadderSubscriptionCount(ticker: string): number {
    return this.activeLadderSubscriptions.get(ticker) ?? 0;
  }

  private incrementLadderSubscription(ticker: string): void {
    const next = this.getLadderSubscriptionCount(ticker) + 1;
    this.activeLadderSubscriptions.set(ticker, next);
  }

  private decrementLadderSubscription(ticker: string): void {
    const current = this.getLadderSubscriptionCount(ticker);
    if (current <= 1) {
      this.activeLadderSubscriptions.delete(ticker);
      return;
    }

    this.activeLadderSubscriptions.set(ticker, current - 1);
  }

  private async resubscribeAll() {
    if (!this.hasActiveSubscriptions()) return;

    console.log('Resubscribing active SignalR subscriptions');
    const connected = await this.ensureConnected();
    if (!connected || !this.hubConnection) {
      console.warn('Cannot resubscribe: hubConnection is not connected');
      return;
    }

    const ladderSubscribedTickers = new Set<string>();
    const resubscribeTasks = Array.from(this.activeSubscriptions.values()).map(
      (subscription) => {
        const subscribeLadder = !ladderSubscribedTickers.has(subscription.ticker);
        if (subscribeLadder) {
          ladderSubscribedTickers.add(subscription.ticker);
        }
        return this.invokeSubscribe(subscription, false, subscribeLadder);
      }
    );

    await Promise.all(resubscribeTasks);

    const directLadderTickers = new Set(this.activeDirectLadderSubscriptions.values());
    const directLadderTasks = Array.from(directLadderTickers)
      .filter((ticker) => !ladderSubscribedTickers.has(ticker))
      .map((ticker) => this.hubConnection!.invoke('SubscribeLadder', ticker));

    await Promise.all(directLadderTasks);
  }

  public async Subscribe(
    params: FootprintSubscribeParams,
    logParams: boolean = true
  ): Promise<string | null> {
    const connected = await this.ensureConnected();
    if (!connected || !this.hubConnection) {
      console.warn('Cannot subscribe, hubConnection is not connected');
      return null;
    }

    const key = this.buildSubscriptionKey(params);
    if (this.activeSubscriptions.has(key)) {
      return key;
    }

    const shouldSubscribeLadder = this.getLadderSubscriptionCount(params.ticker) === 0;
    const subscribed = await this.invokeSubscribe(
      params,
      logParams,
      shouldSubscribeLadder
    );
    if (subscribed) {
      this.activeSubscriptions.set(key, { ...params });
      this.incrementLadderSubscription(params.ticker);
      return key;
    }

    return null;
  }

  public async unsubscr(key: string | null): Promise<boolean> {
    if (!key) {
      console.warn('Cannot unsubscribe, subscription key is required');
      return false;
    }

    const params = this.activeSubscriptions.get(key);
    if (!params) {
      console.warn('Cannot unsubscribe, subscription parameters are missing');
      return false;
    }

    const shouldUnsubscribeLadder = this.getLadderSubscriptionCount(params.ticker) <= 1;

    const removeLocalTracking = async () => {
      this.activeSubscriptions.delete(key);
      this.decrementLadderSubscription(params.ticker);
      if (!this.hasActiveSubscriptions()) {
        await this.stopConnection();
      }
    };

    if (!this.hubConnection) {
      console.warn('Cannot unsubscribe, hubConnection is missing');
      await removeLocalTracking();
      return true;
    }

    const isConnected =
      this.hubConnection.state === signalR.HubConnectionState.Connected;
    if (!isConnected) {
      console.warn('Cannot unsubscribe, hubConnection is not connected');
      await removeLocalTracking();
      return true;
    }

    try {
      const subscriptionPayload = JSON.stringify(params);

      await this.hubConnection.invoke('UnSubscribeCluster', subscriptionPayload);
      if (shouldUnsubscribeLadder) {
        await this.hubConnection.invoke('UnSubscribeLadder', params.ticker);
      }
      console.log('Unsubscribed from ' + params.ticker);
      await removeLocalTracking();
      return true;
    } catch (err) {
      if (this.isConnectionClosedInvocationError(err)) {
        await removeLocalTracking();
        return true;
      }

      console.warn('Error while invoking UnSubscribe methods: ' + err);
      return false;
    }

  }

  public async subscribeLadder(ticker: string): Promise<string | null> {
    if (!ticker) {
      console.warn('Cannot subscribe ladder, ticker is required');
      return null;
    }

    const connected = await this.ensureConnected();
    if (!connected || !this.hubConnection) {
      console.warn('Cannot subscribe ladder, hubConnection is not connected');
      return null;
    }

    const shouldSubscribeLadder = this.getLadderSubscriptionCount(ticker) === 0;
    if (shouldSubscribeLadder) {
      try {
        await this.hubConnection.invoke('SubscribeLadder', ticker);
      } catch (err) {
        console.warn('Error while invoking SubscribeLadder: ' + err);
        return null;
      }
    }

    this.incrementLadderSubscription(ticker);
    this.ladderSubscriptionSequence += 1;
    const key = `ladder:${ticker}:${this.ladderSubscriptionSequence}`;
    this.activeDirectLadderSubscriptions.set(key, ticker);
    return key;
  }

  public async unsubscrLadder(key: string | null): Promise<boolean> {
    if (!key) {
      console.warn('Cannot unsubscribe ladder, subscription key is required');
      return false;
    }

    const ticker = this.activeDirectLadderSubscriptions.get(key);
    if (!ticker) {
      console.warn('Cannot unsubscribe ladder, subscription parameters are missing');
      return false;
    }

    const shouldUnsubscribeLadder = this.getLadderSubscriptionCount(ticker) <= 1;
    const removeLocalTracking = async () => {
      this.activeDirectLadderSubscriptions.delete(key);
      this.decrementLadderSubscription(ticker);
      if (!this.hasActiveSubscriptions()) {
        await this.stopConnection();
      }
    };

    if (!this.hubConnection) {
      console.warn('Cannot unsubscribe ladder, hubConnection is missing');
      await removeLocalTracking();
      return true;
    }

    const isConnected =
      this.hubConnection.state === signalR.HubConnectionState.Connected;
    if (!isConnected) {
      console.warn('Cannot unsubscribe ladder, hubConnection is not connected');
      await removeLocalTracking();
      return true;
    }

    try {
      if (shouldUnsubscribeLadder) {
        await this.hubConnection.invoke('UnSubscribeLadder', ticker);
      }
      await removeLocalTracking();
      return true;
    } catch (err) {
      if (this.isConnectionClosedInvocationError(err)) {
        await removeLocalTracking();
        return true;
      }

      console.warn('Error while invoking UnSubscribeLadder: ' + err);
      return false;
    }
  }

  private isConnectionClosedInvocationError(err: unknown): boolean {
    const text = String(err ?? '').toLowerCase();
    return (
      text.includes('invocation canceled due to the underlying connection being closed') ||
      text.includes('cannot send data if the connection is not in the connected state') ||
      text.includes('the connection was stopped')
    );
  }

  private async invokeSubscribe(
    params: FootprintSubscribeParams,
    logParams: boolean,
    subscribeLadder: boolean
  ): Promise<boolean> {
    if (!this.hubConnection) {
      console.warn('Cannot subscribe: hubConnection is missing');
      return false;
    }

    try {
      const subscriptionPayload = JSON.stringify(params);
      await this.hubConnection.invoke('SubscribeCluster', subscriptionPayload);
      if (subscribeLadder) {
        try {
          await this.hubConnection.invoke('SubscribeLadder', params.ticker);
        } catch (ladderError) {
          try {
            await this.hubConnection.invoke('UnSubscribeCluster', subscriptionPayload);
          } catch (rollbackError) {
            console.warn('Subscribe rollback failed for cluster: ' + rollbackError);
          }
          throw ladderError;
        }
      }

      if (logParams) {
        console.log(`Subscribed to ${params.ticker} (${params.period}/${params.step})`);
      }
      return true;
    } catch (err) {
      console.warn('Error while invoking Subscribe methods: ' + err);
      return false;
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.isStopping && this.stopPromise) {
      await this.stopPromise;
    }

    if (!this.startPromise && (!this.hubConnection || this.hubConnection.state === signalR.HubConnectionState.Disconnected)) {
      await this.startConnection();
    }

    if (this.startPromise) {
      try {
        await this.startPromise;
      } catch (err) {
        console.warn('Error while waiting for SignalR start: ' + err);
        return false;
      }
    }

    return (
      this.hubConnection !== undefined &&
      this.hubConnection.state === signalR.HubConnectionState.Connected
    );
  }

  private scheduleReconnect(reason: string) {
    if (this.isStopping || !this.hasActiveSubscriptions()) return;
    if (this.reconnectTimeoutId !== null) return;

    const delay = this.getReconnectDelay();
    console.warn(`Scheduling SignalR reconnect in ${delay}ms (${reason})`);
    this.reconnectTimeoutId = setTimeout(async () => {
      this.reconnectTimeoutId = null;
      try {
        await this.startConnection();
        await this.resubscribeAll();
      } catch (err) {
        console.warn('SignalR reconnect attempt failed', err);
        this.reconnectAttempt += 1;
        this.scheduleReconnect('retry');
      }
    }, delay);
  }

  private getReconnectDelay(): number {
    const base = Math.min(
      this.reconnectMaxDelayMs,
      this.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempt)
    );
    const jitter = Math.round(base * 0.2 * Math.random());
    return base + jitter;
  }

  private clearReconnectTimer() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  public async stopConnection() {
    if (this.isStopping && this.stopPromise) {
      return this.stopPromise;
    }

    this.isStopping = true;
    this.clearReconnectTimer();

    this.stopPromise = (async () => {
      if (this.isConnecting && this.startPromise) {
        try {
          await this.startPromise;
        } catch (_) {
          // Ignore start errors when attempting to stop
        }
      }

      if (this.hubConnection) {
        this.clearServerEvents();
      }

      if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
        try {
          await this.hubConnection.stop();
          console.log('SignalR connection stopped');
        } catch (err) {
          console.warn('Error while stopping SignalR connection: ' + err);
        }
      }

      this.startPromise = null;
      this.hubConnection = undefined;
      this.activeSubscriptions.clear();
      this.activeDirectLadderSubscriptions.clear();
      this.activeLadderSubscriptions.clear();
      this.reconnectAttempt = 0;
    })()
      .catch((err) => console.warn('Error while stopping SignalR connection: ' + err))
      .finally(() => {
        this.isStopping = false;
        this.stopPromise = null;
      });

    return this.stopPromise;
  }

  ngOnDestroy() {
    // При уничтожении сервиса останавливаем подключение
    void this.stopConnection();
    this.receiveClusterEnvelopeSubject.complete();
    this.receiveTicksEnvelopeSubject.complete();
    this.receiveLadderEnvelopeSubject.complete();
  }
}
