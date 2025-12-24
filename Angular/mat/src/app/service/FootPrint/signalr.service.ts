import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { FootPrintComponent } from 'src/app/components/footprint/footprint.component';
import { environment } from 'src/app/environment';

@Injectable()
export class SignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection | undefined;
  private isConnecting: boolean = false;
  private isStopping: boolean = false;
  private startPromise: Promise<void> | null = null;
  NP: FootPrintComponent | null = null;

  constructor() {}

  public async startConnection(NP: FootPrintComponent): Promise<void> {
    this.NP = NP;
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
      // При закрытии соединения очищаем hubConnection
      this.hubConnection = undefined;
      this.startPromise = null;
      this.isStopping = false;
      console.log('SignalR connection closed');
    });

    this.registerOnServerEvents();

    this.startPromise = this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR connection started');
      })
      .catch((err) => {
        console.error('Error while starting SignalR connection: ' + err.toString());
        throw err;
      })
      .finally(() => {
        this.isConnecting = false;
      });

    return this.startPromise;
  }

  private registerOnServerEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('recieveCluster', (answ) => {
      if (!this.NP) {
        console.warn('Skip recieveCluster: component instance is missing');
        return;
      }
      this.NP.handleCluster(answ);
    });

    this.hubConnection.on('recieveTicks', (answ) => {
      if (!this.NP) {
        console.warn('Skip recieveTicks: component instance is missing');
        return;
      }
      this.NP.handleTicks(answ);
    });

    this.hubConnection.on('recieveLadder', (ladder) => {
      if (!ladder) {
        console.warn('Skip recieveLadder: payload is null or undefined');
        return;
      }
      if (!this.NP) {
        console.warn('Skip recieveLadder: component instance is missing');
        return;
      }
      this.NP.handleLadder(ladder);
    });
  }

  old: any = null;

  public async Subscribe(params: any) {
    this.old = { ...params };

    const connected = await this.ensureConnected();
    if (!connected) {
      console.warn('Cannot subscribe, hubConnection is not connected');
      return;
    }

    if (!this.hubConnection) {
      console.warn('Cannot subscribe, hubConnection is missing');
      return;
    }

    try {
      await this.hubConnection.invoke('SubscribeCluster', JSON.stringify(this.old));
      await this.hubConnection.invoke('SubscribeLadder', this.old.ticker);
      console.error('subscr  ' + params.ticker);
    } catch (err) {
      console.error('Error while invoking Subscribe methods: ' + err.toString());
    }
  }

  public async unsubscr() {

    if (this.old == null) {
      console.warn('Cannot unsubscribe, old parameters are missing');
      return;
    }

    const connected = await this.ensureConnected();
    if (!connected) {
      console.warn('Cannot unsubscribe, hubConnection is not connected');
      return;
    }

    if (!this.hubConnection) {
      console.warn('Cannot unsubscribe, hubConnection is missing');
      return;
    }

    try {
      let old = { ...this.old };
      await this.hubConnection.invoke('UnSubscribeCluster', JSON.stringify(old));
      await this.hubConnection.invoke('UnSubscribeLadder', old.ticker);
      console.error('un subscr  ' + old.ticker);
    } catch (err) {
      console.error('Error while invoking UnSubscribe methods: ' + err.toString());
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
        console.error('Error while waiting for SignalR start: ' + err.toString());
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
        console.error('Error while stopping SignalR connection: ' + err.toString());
      }
    }

    this.startPromise = null;
    this.hubConnection = undefined;
    this.NP = null;
    this.old = null;
    this.isStopping = false;
  }

  ngOnDestroy() {
    // При уничтожении сервиса останавливаем подключение
    this.stopConnection();
  }
}
