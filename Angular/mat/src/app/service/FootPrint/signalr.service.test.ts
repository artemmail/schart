import { expect } from '@jest/globals';

// These tests exercise the real transport service against an in-memory hub.
// Angular's decorator is irrelevant to subscription ownership in Node.
jest.mock('@angular/core', () => ({ Injectable: () => (target: unknown) => target }));
jest.mock('src/app/environment', () => ({ environment: { apiUrl: '' } }), { virtual: true });

import { HubConnectionState } from '@microsoft/signalr';
import { SignalRService } from './signalr.service';

function makeService() {
  const service = new SignalRService();
  const hub = {
    state: HubConnectionState.Connected,
    invoke: jest.fn().mockResolvedValue(undefined),
    off: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  Object.assign(service, { hubConnection: hub });
  return { service, hub };
}

const params = { ticker: 'SBER', period: 1, step: 1 };

describe('SignalR subscription ownership', () => {
  it('shares one transport subscription and releases only the last owner', async () => {
    const { service, hub } = makeService();
    const [first, second] = await Promise.all([service.Subscribe(params), service.Subscribe(params)]);
    expect(first).toBeTruthy();
    expect(second).not.toBe(first);
    expect(hub.invoke.mock.calls.map(call => call[0])).toEqual(['SubscribeCluster', 'SubscribeLadder']);

    expect(await service.unsubscr(first)).toBe(true);
    expect(await service.unsubscr(first)).toBe(true);
    expect(hub.invoke).toHaveBeenCalledTimes(2);
    expect(hub.stop).not.toHaveBeenCalled();

    expect(await service.unsubscr(second)).toBe(true);
    expect(hub.invoke.mock.calls.map(call => call[0]))
      .toEqual(['SubscribeCluster', 'SubscribeLadder', 'UnSubscribeCluster', 'UnSubscribeLadder']);
    expect(hub.stop).toHaveBeenCalledTimes(1);
  });

  it('keeps event delivery scoped to the remaining owner', async () => {
    const { service } = makeService();
    const first = await service.Subscribe(params);
    const second = await service.Subscribe(params);
    const received: unknown[] = [];
    const subscription = service.receiveClusterFor(params).subscribe(data => received.push(data));
    await service.unsubscr(first);
    (service as any).clusterEnvelopeHandler({ key: 'SBER_60_1', data: [] });
    (service as any).clusterEnvelopeHandler({ key: 'GAZP_60_1', data: [] });
    expect(received).toEqual([[]]);
    subscription.unsubscribe();
    await service.unsubscr(second);
  });

  it('preserves owners across reconnect and resubscribes each unique key once', async () => {
    const { service, hub } = makeService();
    const first = await service.Subscribe(params);
    const second = await service.Subscribe(params);
    hub.invoke.mockClear();
    await (service as any).resubscribeAll();
    expect(hub.invoke.mock.calls.map(call => call[0])).toEqual(['SubscribeCluster', 'SubscribeLadder']);
    await service.unsubscr(first);
    expect(hub.invoke).toHaveBeenCalledTimes(2);
    await service.unsubscr(second);
    expect(hub.stop).toHaveBeenCalledTimes(1);
  });

  it('serializes cluster and direct ladder acquisitions for the same ticker', async () => {
    const { service, hub } = makeService();
    const [cluster, ladder] = await Promise.all([service.Subscribe(params), service.subscribeLadder(params.ticker)]);
    expect(hub.invoke.mock.calls.map(call => call[0])).toEqual(['SubscribeCluster', 'SubscribeLadder']);
    await service.unsubscr(cluster);
    expect(hub.invoke.mock.calls.map(call => call[0])).toEqual([
      'SubscribeCluster', 'SubscribeLadder', 'UnSubscribeCluster',
    ]);
    expect(hub.stop).not.toHaveBeenCalled();
    await service.unsubscrLadder(ladder);
    await service.unsubscrLadder(ladder);
    expect(hub.invoke.mock.calls.map(call => call[0])).toEqual([
      'SubscribeCluster', 'SubscribeLadder', 'UnSubscribeCluster', 'UnSubscribeLadder',
    ]);
  });

  it('shares a ladder across different periods without conflating cluster owners', async () => {
    const { service, hub } = makeService();
    const first = await service.Subscribe(params);
    const second = await service.Subscribe({ ...params, period: 5 });
    await service.unsubscr(first);
    expect(hub.invoke.mock.calls.map(call => call[0])).toEqual([
      'SubscribeCluster', 'SubscribeLadder', 'SubscribeCluster', 'UnSubscribeCluster',
    ]);
    expect(hub.stop).not.toHaveBeenCalled();
    await service.unsubscr(second);
    expect(hub.invoke.mock.calls.filter(call => call[0] === 'UnSubscribeLadder')).toHaveLength(1);
  });

  it('does not retain an owner after failed subscribe and permits retry', async () => {
    const { service, hub } = makeService();
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      hub.invoke.mockRejectedValueOnce(new Error('temporary failure'));
      expect(await service.Subscribe(params)).toBeNull();
      const handle = await service.Subscribe(params);
      expect(handle).toBeTruthy();
      await service.unsubscr(handle);
      expect(hub.stop).toHaveBeenCalledTimes(1);
    } finally {
      warning.mockRestore();
    }
  });

  it('clears ownership on stop and a stale release cannot affect new subscribers', async () => {
    const { service, hub } = makeService();
    const oldHandle = await service.Subscribe(params);
    await service.stopConnection();
    Object.assign(service, { hubConnection: hub });
    const newHandle = await service.Subscribe(params);
    hub.invoke.mockClear();
    await service.unsubscr(oldHandle);
    expect(hub.invoke).not.toHaveBeenCalled();
    await service.unsubscr(newHandle);
    expect(hub.invoke.mock.calls.map(call => call[0])).toEqual(['UnSubscribeCluster', 'UnSubscribeLadder']);
  });
});
