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
  private subscriptionActive = false;
  private subscriptionParams: FootprintSubscribeParams | null = null;

  private recieveClusterSubject = new Subject<ColumnEx[]>();
  recieveCluster$ = this.recieveClusterSubject.asObservable();

  private recieveTicksSubject = new Subject<FootprintTickData[]>();
  recieveTicks$ = this.recieveTicksSubject.asObservable();

  private recieveLadderSubject = new Subject<FootprintLadderData>();
  recieveLadder$ = this.recieveLadderSubject.asObservable();

  constructor() {}

  public async startConnection(): Promise<void> {
    this.isStopping = false;

    if (
      this.hubConnection &&
      (this.hubConnection.state === signalR.HubConnectionState.Connected ||
        this.hubConnection.state === signalR.HubConnectionState.Connecting)
    ) {
      // Уже подключены или идет процесс подключения
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
      this.isStopping = false;
      console.log('SignalR connection closed');
    });

    this.hubConnection.onreconnecting(() => {
      console.warn('SignalR connection reconnecting...');
    });

    this.hubConnection.onreconnected(async () => {
      console.log('SignalR connection reconnected');
      if (this.subscriptionActive && this.subscriptionParams) {
        await this.Subscribe(this.subscriptionParams);
      }
    });

    this.registerOnServerEvents();

    this.startPromise = this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR connection started');
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

    this.hubConnection.on('recieveCluster', (answ: ColumnEx[]) => {
      this.recieveClusterSubject.next(answ);
    });

    this.hubConnection.on('recieveTicks', (answ: FootprintTickData[]) => {
      this.recieveTicksSubject.next(answ);
    });

    this.hubConnection.on('recieveLadder', (ladder: FootprintLadderData) => {
      if (!ladder) {
        console.warn('Skip recieveLadder: payload is null or undefined');
        return;
      }
      this.recieveLadderSubject.next(ladder);
    });
  }

  public async Subscribe(params: FootprintSubscribeParams): Promise<boolean> {
    this.subscriptionParams = { ...params };

    const connected = await this.ensureConnected();
    if (!connected || !this.hubConnection) {
      console.warn('Cannot subscribe, hubConnection is not connected');
      this.subscriptionActive = false;
      return false;
    }

    try {
      await this.hubConnection.invoke('SubscribeCluster', JSON.stringify(this.subscriptionParams));
      await this.hubConnection.invoke('SubscribeLadder', this.subscriptionParams.ticker);
      this.subscriptionActive = true;
      console.log('Subscribed to ' + params.ticker);
      return true;
    } catch (err) {
      console.warn('Error while invoking Subscribe methods: ' + err);
      this.subscriptionActive = false;
      return false;
    }
  }

  public async unsubscr(): Promise<boolean> {
    if (!this.subscriptionParams) {
      console.warn('Cannot unsubscribe, subscription parameters are missing');
      this.subscriptionActive = false;
      return false;
    }

    if (!this.hubConnection) {
      console.warn('Cannot unsubscribe, hubConnection is missing');
      this.subscriptionActive = false;
      this.subscriptionParams = null;
      return false;
    }

    const isConnected =
      this.hubConnection.state === signalR.HubConnectionState.Connected;
    if (!isConnected) {
      console.warn('Cannot unsubscribe, hubConnection is not connected');
      this.subscriptionActive = false;
      this.subscriptionParams = null;
      return false;
    }

    try {
      const previousParams = { ...this.subscriptionParams };
      await this.hubConnection.invoke('UnSubscribeCluster', JSON.stringify(previousParams));
      await this.hubConnection.invoke('UnSubscribeLadder', previousParams.ticker);
      console.log('Unsubscribed from ' + previousParams.ticker);
      this.subscriptionActive = false;
      this.subscriptionParams = null;
      return true;
    } catch (err) {
      console.warn('Error while invoking UnSubscribe methods: ' + err);
      return false;
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.isStopping) {
      return false;
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
    this.isStopping = true;

    if (this.isConnecting && this.startPromise) {
      try {
        await this.startPromise;
      } catch (_) {
        // Ignore start errors when attempting to stop
      }
    }

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.stop();
        console.log('SignalR connection stopped');
      } catch (err) {
        console.warn('Error while stopping SignalR connection: ' + err);
      }
    }

    this.startPromise = null;
    this.hubConnection = undefined;
    this.subscriptionActive = false;
    this.subscriptionParams = null;
    this.isStopping = false;
  }

  public hasActiveSubscription(): boolean {
    return this.subscriptionActive;
  }

  ngOnDestroy() {
    // При уничтожении сервиса останавливаем подключение
    this.stopConnection();
  }
}
