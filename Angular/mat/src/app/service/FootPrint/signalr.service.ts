import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
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

@Injectable()
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

  private readonly serverEventNames = {
    cluster: ['receiveCluster', 'recieveCluster'],
    ticks: ['receiveTicks', 'recieveTicks'],
    ladder: ['receiveLadder', 'recieveLadder'],
  } as const;

  private receiveClusterSubject = new Subject<ColumnEx[]>();
  receiveCluster$ = this.receiveClusterSubject.asObservable();

  private receiveTicksSubject = new Subject<FootprintTickData[]>();
  receiveTicks$ = this.receiveTicksSubject.asObservable();

  private receiveLadderSubject = new Subject<FootprintLadderData>();
  receiveLadder$ = this.receiveLadderSubject.asObservable();

  private clusterHandler = (answ: ColumnEx[]) => {
    this.receiveClusterSubject.next(answ);
  };

  private ticksHandler = (answ: FootprintTickData[]) => {
    this.receiveTicksSubject.next(answ);
  };

  private ladderHandler = (ladder: FootprintLadderData) => {
    if (!ladder) {
      console.warn('Skip receiveLadder: payload is null or undefined');
      return;
    }
    this.receiveLadderSubject.next(ladder);
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

    connection.onclose(async (error) => {
      if (this.hubConnection !== connection) return;

      this.hubConnection = undefined;
      this.startPromise = null;
      console.log('SignalR connection closed');

      const hasSubscriptions = !!this.activeSubscriptions.size;
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
        if (!this.isStopping && this.activeSubscriptions.size) {
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

    this.registerEventHandlers('cluster', this.clusterHandler);
    this.registerEventHandlers('ticks', this.ticksHandler);
    this.registerEventHandlers('ladder', this.ladderHandler);
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

  private async resubscribeAll() {
    if (!this.activeSubscriptions.size) return;

    console.log('Resubscribing active SignalR subscriptions');
    const connected = await this.ensureConnected();
    if (!connected || !this.hubConnection) {
      console.warn('Cannot resubscribe: hubConnection is not connected');
      return;
    }

    const resubscribeTasks = Array.from(this.activeSubscriptions.values()).map(
      (subscription) => this.invokeSubscribe(subscription, false)
    );

    await Promise.all(resubscribeTasks);
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

    const subscribed = await this.invokeSubscribe(params, logParams);
    if (subscribed) {
      this.activeSubscriptions.set(key, { ...params });
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

    const ensureCleanupAfterRemoval = async () => {
      this.activeSubscriptions.delete(key);
      if (!this.activeSubscriptions.size) {
        await this.stopConnection();
      }
    };

    if (!this.hubConnection) {
      console.warn('Cannot unsubscribe, hubConnection is missing');
      await ensureCleanupAfterRemoval();
      return true;
    }

    const isConnected =
      this.hubConnection.state === signalR.HubConnectionState.Connected;
    if (!isConnected) {
      console.warn('Cannot unsubscribe, hubConnection is not connected');
      await ensureCleanupAfterRemoval();
      return true;
    }

    try {
      const subscriptionPayload = JSON.stringify(params);

      await this.hubConnection.invoke('UnSubscribeCluster', subscriptionPayload);
      await this.hubConnection.invoke('UnSubscribeLadder', params.ticker);
      console.log('Unsubscribed from ' + params.ticker);
      await ensureCleanupAfterRemoval();
      return true;
    } catch (err) {
      console.warn('Error while invoking UnSubscribe methods: ' + err);
      return false;
    }

  }

  private async invokeSubscribe(
    params: FootprintSubscribeParams,
    logParams: boolean
  ): Promise<boolean> {
    if (!this.hubConnection) {
      console.warn('Cannot subscribe: hubConnection is missing');
      return false;
    }

    try {
      const subscriptionPayload = JSON.stringify(params);
      await this.hubConnection.invoke('SubscribeCluster', subscriptionPayload);
      await this.hubConnection.invoke('SubscribeLadder', params.ticker);
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
    if (this.isStopping || !this.activeSubscriptions.size) return;
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
    this.receiveClusterSubject.complete();
    this.receiveTicksSubject.complete();
    this.receiveLadderSubject.complete();
  }
}
