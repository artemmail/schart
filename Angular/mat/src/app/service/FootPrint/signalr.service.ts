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

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection | undefined;
  private isConnecting: boolean = false;
  private isStopping: boolean = false;
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;

  private activeSubscriptions = new Map<string, FootprintSubscribeParams>();

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

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/CandlesHub`, {
        withCredentials: true,
      })
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.onclose(async () => {
      this.hubConnection = undefined;
      this.startPromise = null;
      console.log('SignalR connection closed');
    });

    this.hubConnection.onreconnecting(() => {
      console.warn('SignalR connection reconnecting...');
    });

    this.hubConnection.onreconnected(async () => {
      console.log('SignalR connection reconnected');
      await this.resubscribeAll();
    });

    this.registerOnServerEvents();

    this.startPromise = this.hubConnection
      .start()
      .then(() => {
        if (this.isStopping) {
          return Promise.reject('Connection start cancelled due to stop request');
        }
        console.log('SignalR connection started');
        return Promise.resolve();
      })
      .catch((err) => {
        console.warn('Error while starting SignalR connection: ' + err.toString());
        throw err;
      })
      .finally(() => {
        this.isConnecting = false;
      });

    return this.startPromise;
  }

  private registerOnServerEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('recieveCluster', this.clusterHandler);
    this.hubConnection.on('receiveCluster', this.clusterHandler);

    this.hubConnection.on('recieveTicks', this.ticksHandler);
    this.hubConnection.on('receiveTicks', this.ticksHandler);

    this.hubConnection.on('recieveLadder', this.ladderHandler);
    this.hubConnection.on('receiveLadder', this.ladderHandler);
  }

  private clearServerEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.off('recieveCluster', this.clusterHandler);
    this.hubConnection.off('receiveCluster', this.clusterHandler);
    this.hubConnection.off('recieveTicks', this.ticksHandler);
    this.hubConnection.off('receiveTicks', this.ticksHandler);
    this.hubConnection.off('recieveLadder', this.ladderHandler);
    this.hubConnection.off('receiveLadder', this.ladderHandler);
  }

  private buildSubscriptionKey(params: FootprintSubscribeParams): string {
    return `${params.ticker}:${params.period}:${params.step}`;
  }

  private async resubscribeAll() {
    if (!this.activeSubscriptions.size) return;

    console.log('Resubscribing active SignalR subscriptions');
    for (const subscription of this.activeSubscriptions.values()) {
      await this.Subscribe(subscription, false);
    }
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

    try {
      const subscriptionPayload = JSON.stringify(params);

      await this.hubConnection.invoke('SubscribeCluster', subscriptionPayload);
      await this.hubConnection.invoke('SubscribeLadder', params.ticker);
      this.activeSubscriptions.set(key, { ...params });
      if (logParams) {
        console.log(`Subscribed to ${params.ticker} (${params.period}/${params.step})`);
      }
      return key;
    } catch (err) {
      console.warn('Error while invoking Subscribe methods: ' + err);
      return null;
    }
  }

  public async unsubscr(key?: string | null): Promise<boolean> {
    if (!this.hubConnection) {
      console.warn('Cannot unsubscribe, hubConnection is missing');
      return false;
    }

    const subscriptionKey = key ?? this.activeSubscriptions.keys().next().value;
    if (!subscriptionKey) {
      console.warn('Cannot unsubscribe, subscription key is missing');
      return false;
    }

    const params = this.activeSubscriptions.get(subscriptionKey);
    if (!params) {
      console.warn('Cannot unsubscribe, subscription parameters are missing');
      return false;
    }

    const isConnected =
      this.hubConnection.state === signalR.HubConnectionState.Connected;
    if (!isConnected) {
      console.warn('Cannot unsubscribe, hubConnection is not connected');
      this.activeSubscriptions.delete(subscriptionKey);
      return false;
    }

    try {
      const subscriptionPayload = JSON.stringify(params);

      await this.hubConnection.invoke('UnSubscribeCluster', subscriptionPayload);
      await this.hubConnection.invoke('UnSubscribeLadder', params.ticker);
      console.log('Unsubscribed from ' + params.ticker);
      this.activeSubscriptions.delete(subscriptionKey);

      if (!this.activeSubscriptions.size) {
        await this.stopConnection();
      }
      return true;
    } catch (err) {
      console.warn('Error while invoking UnSubscribe methods: ' + err);
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

  public async stopConnection() {
    if (this.isStopping && this.stopPromise) {
      return this.stopPromise;
    }

    this.isStopping = true;

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
