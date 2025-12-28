import { Subject, firstValueFrom } from 'rxjs';
import { FootprintRealtimeUpdaterService } from '../footprint-realtime-updater.service';
import { FootPrintParameters } from 'src/app/models/Params';
import { FootprintUpdateEvent } from '../footprint-data.types';

describe('FootprintRealtimeUpdaterService', () => {
  const params: FootPrintParameters = {
    ticker: 'TEST',
    period: 1,
    priceStep: 1,
    startDate: new Date('2099-01-01T00:00:00Z'),
    endDate: new Date('2099-01-02T00:00:00Z'),
    candlesOnly: false,
  };

  const buildService = () => {
    const signalR = new SignalRServiceStub();
    const dataLoader = new DataLoaderStub();
    const service = new FootprintRealtimeUpdaterService(signalR as any, dataLoader as any);
    return { service, signalR, dataLoader };
  };

  it('subscribes once and aggregates realtime updates', async () => {
    const { service, signalR, dataLoader } = buildService();

    await service.configure(params, { minimode: false, deltamode: false });

    const updatePromise = firstValueFrom(service.updates$);
    const clusterPayload = [{ Number: 1 }];
    signalR.receiveClusterSubject.next(clusterPayload as any);

    const update = await updatePromise;
    expect(update).toEqual({ type: 'cluster', merged: true } as FootprintUpdateEvent);
    expect(dataLoader.applyRealtimeUpdate).toHaveBeenCalledWith('cluster', clusterPayload);
    expect(signalR.subscribeCalls).toBe(1);
  });

  it('tears down realtime subscription on destroy', async () => {
    const { service, signalR } = buildService();
    await service.configure(params, { minimode: false, deltamode: false });

    await service.destroy();

    expect(signalR.unsubscribedKey).toBe('TEST:1:1');
  });
});

class SignalRServiceStub {
  receiveClusterSubject = new Subject<any>();
  receiveCluster$ = this.receiveClusterSubject.asObservable();
  receiveTicks$ = new Subject<any[]>().asObservable();
  receiveLadder$ = new Subject<Record<string, number>>().asObservable();

  subscribeCalls = 0;
  unsubscribedKey: string | null = null;

  async Subscribe(params: { ticker: string; period: number; step: number }) {
    this.subscribeCalls++;
    return `${params.ticker}:${params.period}:${params.step}`;
  }

  async unsubscr(key: string) {
    this.unsubscribedKey = key;
  }
}

class DataLoaderStub {
  applyRealtimeUpdate = jest.fn().mockReturnValue({ type: 'cluster', merged: true });
}
