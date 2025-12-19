using DataProvider.Models;
using StockChart.EventBus.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;

public class TradesCacherRepository : ITradesCacherRepository
{
    private readonly ConcurrentDictionary<SubsCluster, ClusterMachine> _clusterMachines = new ConcurrentDictionary<SubsCluster, ClusterMachine>();
    private readonly ConcurrentDictionary<SubsCandle, CandlesMachine> _candleMachines = new ConcurrentDictionary<SubsCandle, CandlesMachine>();
    private readonly ConcurrentDictionary<string, TradesStream> _streams = new ConcurrentDictionary<string, TradesStream>();

    public TradesCacherRepository() { }

    public void PushTrade(string ticker, Trade trade)
    {
        ticker = ticker.ToUpper();
        var stream = _streams.GetOrAdd(ticker, _ => new TradesStream());
        stream.PushTrade(trade);
    }

    public void CleanUp()
    {
        _streams.Clear();
        _clusterMachines.Clear();
        _candleMachines.Clear();
        GC.Collect();
    }

    public void CleanUpGraphics()
    {
        _clusterMachines.Clear();
        _candleMachines.Clear();
        GC.Collect();
    }

    public List<ClusterColumnWCF> ClusterProfileQuery(SubsCluster subscription, DateTime startDate, DateTime endDate)
    {
        try
        {
            if (!_streams.TryGetValue(subscription.ticker, out var stream))
                return new List<ClusterColumnWCF>();

            var machine = _clusterMachines.GetOrAdd(subscription, _ => new ClusterMachine(stream, subscription.period.Value, subscription.step));

            lock (machine)
            {
                machine.UpdateStream();
                return machine.GetClusters(startDate, endDate);
            }
        }
        catch (Exception e)
        {
            LogException("c:/log/clus_ex.txt", e);
            return null;
        }
    }

    public List<tick> TicksQuery(string ticker, DateTime startDate, DateTime endDate)
    {
        if (!_streams.TryGetValue(ticker, out var stream))
            return new List<tick>();

        return stream.TradesList
            .Where(trade => trade.rounddate >= startDate && trade.rounddate < endDate)
            .Select(trade => new tick
            {
                Number = trade.number & 0x0000ffffffffffff,
                Quantity = trade.Quantity,
                Direction = trade.Direction,
                OI = trade.OI,
                Price = trade.Price,
                TradeDate = trade.rounddate,
                Volume = trade.Volume
            })
            .ToList();
    }

    public List<BaseCandle> CandlesQuery(string ticker, double period, DateTime startDate, DateTime endDate)
    {
        try
        {
            if (!_streams.TryGetValue(ticker, out var stream))
                return new List<BaseCandle>();

            var subscription = new SubsCandle { ticker = ticker, period = period };
            var machine = _candleMachines.GetOrAdd(subscription, _ => new CandlesMachine(stream, period));

            machine.UpdateStream();
            return machine.GetCandles(startDate, endDate);
        }
        catch (Exception e)
        {
            LogException("c:/log/Can1_ex.txt", e);
            return null;
        }
    }

    public List<BaseCandle> LastCandles(string ticker, double period, int count)
    {
        ticker = ticker.ToUpper();

        if (!_streams.TryGetValue(ticker, out var stream))
            return new List<BaseCandle>();

        var subscription = new SubsCandle { ticker = ticker, period = period };
        var machine = _candleMachines.GetOrAdd(subscription, _ => new CandlesMachine(stream, period));

        machine.UpdateStream();
        return machine.GetLastCandles(count);
    }

    public List<ClusterColumnWCF> LastClusters(SubsCluster subscription, int count)
    {
        if (!_clusterMachines.TryGetValue(subscription, out var machine))
            machine = _clusterMachines.GetOrAdd(subscription, _ => new ClusterMachine(_streams[subscription.ticker.ToUpper()], subscription.period.Value, subscription.step));

        lock (machine)
        {
            machine.UpdateStream();
            return machine.GetLastClusters(count);
        }
    }

    public List<tick> LastTickers(string ticker)
    {
        ticker = ticker.ToUpper();

        if (!_streams.TryGetValue(ticker, out var stream))
            return new List<tick>();

        var timeSpan = TimeSpan.FromSeconds(5);


        if(!stream.TradesList.Any())
            return new List<tick>();

        Trade lastTrade = stream.TradesList.Last();               
        var lastDate = lastTrade.rounddate;
        var position = stream.TradesList.Count - 1;

        while (position >= 0 && (lastDate - stream.TradesList[position].rounddate) < timeSpan)
            position--;

        position++;

        return stream.TradesList.Skip(position)
            .Select(trade => new tick
            {
                Direction = trade.Direction,
                Quantity = trade.Quantity,
                Number = trade.number & 0x0000ffffffffffff,
                Price = trade.Price,
                Volume = trade.Volume,
                OI = trade.OI,
                TradeDate = trade.rounddate
            })
            .ToList();
    }

    public Dictionary<string, List<BaseCandle>> CandlesQueryBatch(SubsCandle[] subscriptions, int count)
    {
        var result = new Dictionary<string, List<BaseCandle>>();

        foreach (var subscription in subscriptions)
        {
            var candles = LastCandles(subscription.ticker, subscription.period.Value, count);
            if (candles.Any())
                result[subscription.ToString()] = candles;
        }

        return result;
    }

    public Dictionary<string, List<ClusterColumnWCF>> ClustersQueryBatch(SubsCluster[] subscriptions, int count)
    {
        var result = new Dictionary<string, List<ClusterColumnWCF>>();

        foreach (var subscription in subscriptions)
        {
            var clusters = LastClusters(subscription, count);
            if (clusters.Any())
                result[subscription.ToString()] = clusters;
        }

        return result;
    }

    public Dictionary<string, List<tick>> TickersQueryBatch(SubsCluster[] subscriptions)
    {
        var result = new Dictionary<string, List<tick>>();

        foreach (var subscription in subscriptions)
        {
            var ticks = LastTickers(subscription.ticker);
            if (ticks.Any())
                result[subscription.ToString()] = ticks;
        }

        return result;
    }

    public string[] CachedClusterSubscriptions()
    {
        return _clusterMachines.Keys.Select(x => x.ToString()).ToArray();
    }

    public string[] CachedCandleSubscriptions()
    {
        return _candleMachines.Keys.Select(x => x.ToString()).ToArray();
    }

    private void LogException(string filePath, Exception exception)
    {
        using (var writer = File.AppendText(filePath))
        {
            writer.WriteLine(exception.Message);
            writer.WriteLine(exception.StackTrace);
            writer.WriteLine(exception.Source);
        }
    }
}
