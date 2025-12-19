using DataProvider.Models;
using StockChart.EventBus.Models;
using System;
using System.Collections.Generic;

public interface ITradesCacherRepository
{
    public void PushTrade(string ticker, Trade trade);
    public void CleanUp();
    public void CleanUpGraphics();
    public List<ClusterColumnWCF> ClusterProfileQuery(SubsCluster set, DateTime startDate, DateTime endDate);
    public List<BaseCandle> CandlesQuery(string ticker, double period, DateTime startDate, DateTime endDate);
    public List<tick> TicksQuery(string ticker, DateTime startDate, DateTime endDate);
    public Dictionary<string, List<BaseCandle>> CandlesQueryBatch(SubsCandle[] array, int count);
    public Dictionary<string, List<ClusterColumnWCF>> ClustersQueryBatch(SubsCluster[] array, int count);
    public Dictionary<string, List<tick>> TickersQueryBatch(SubsCluster[] array);
    public List<BaseCandle> LastCandles(string ticker, double period, int count);
    public string[] CachedClusterSubscriptions();
    public string[] CachedCandleSubscriptions();
}