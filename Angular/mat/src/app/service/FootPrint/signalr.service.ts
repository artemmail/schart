import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { FootPrintComponent } from 'src/app/components/footprint/footprint.component';
import { environment } from 'src/app/environment';

@Injectable()
export class SignalRService implements OnDestroy {
  private hubConnection: signalR.HubConnection | undefined;
  private isConnecting: boolean = false;
  NP: FootPrintComponent;

  constructor() {}

  public async startConnection(NP: FootPrintComponent): Promise<void> {
    this.NP = NP;

    if (
      this.hubConnection &&
      (this.hubConnection.state === signalR.HubConnectionState.Connected ||
        this.hubConnection.state === signalR.HubConnectionState.Connecting)
    ) {
      // Уже подключены или идет процесс подключения
      return;
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
      console.log('SignalR connection closed');
    });

    this.registerOnServerEvents();

    try {
      await this.hubConnection.start();
      console.log('SignalR connection started');
    } catch (err) {
      console.error('Error while starting SignalR connection: ' + err.toString());
    } finally {
      this.isConnecting = false;
    }
  }

  private registerOnServerEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('recieveCluster', (answ) => {
      this.NP.handleCluster(answ);
    });
    this.hubConnection.on('recieveTicks', (answ) => this.NP.handleTicks(answ));
    this.hubConnection.on('recieveLadder', (ladder) => this.NP.handleLadder(ladder));
  }

  old: any = null;

  public async Subscribe(params: any) {
    this.old = { ...params };

    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('SubscribeCluster', JSON.stringify(this.old));
        await this.hubConnection.invoke('SubscribeLadder', this.old.ticker);
        console.error('subscr  ' + params.ticker);
      } catch (err) {
        console.error('Error while invoking Subscribe methods: ' + err.toString());
      }
    } else {
      console.warn('Cannot subscribe, hubConnection is not connected');
    }
  }

  public async unsubscr() {
    
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected && this.old != null) {
      try {

        let old = {...this.old};
        await this.hubConnection.invoke('UnSubscribeCluster', JSON.stringify(old));
        await this.hubConnection.invoke('UnSubscribeLadder', old.ticker);
          console.error('un subscr  ' + old.ticker);
      } catch (err) {
        console.error('Error while invoking UnSubscribe methods: ' + err.toString());
      }
    } else {
      console.warn('Cannot unsubscribe, hubConnection is not connected or old parameters are missing');
    }
  }

  public async stopConnection() {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        this.hubConnection = undefined;
        console.log('SignalR connection stopped');
      } catch (err) {
        console.error('Error while stopping SignalR connection: ' + err.toString());
      }
    }
  }

  ngOnDestroy() {
    // При уничтожении сервиса останавливаем подключение
    this.stopConnection();
  }
}
