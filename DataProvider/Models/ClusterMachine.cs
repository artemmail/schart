using DataProvider.Models;
using StockChart.EventBus.Models;
using System;
using System.Collections.Generic;
using System.Linq;

public class ClusterMachine
{
    TradesStream m_stream;
    volatile int last_number = 0;
    public double m_period;
    public decimal m_priceStep;

    bool trad = false;
    public TimeSpan m_span;

    private List<ClusterColumn> ColumnList = new List<ClusterColumn>();
    public void UpdateStream()
    {
        if (trad)
        {
            UpdateStream2();
            return;
        }


        lock (ColumnList)
            for (; last_number < m_stream.TradesList.Count; last_number++)
            {
                var trade = m_stream.TradesList[last_number];
                if (last_number == 0 || !ColumnList.Last().DateCompatibility(trade))
                    ColumnList.Add(new ClusterColumn(trade, this));
                ColumnList.Last().PushTrade(trade);
            }
    }


    public void UpdateStream2()
    {
        lock (ColumnList)
            for (; last_number < m_stream.TradesList.Count; last_number++)
            {
                var trade = m_stream.TradesList[last_number];
                if (last_number == 0 || !thisCandle())
                    ColumnList.Add(new ClusterColumn(trade, this));
                ColumnList.Last().PushTrade(trade);
            }
    }

    public bool thisCandle()
    {
        var trade = m_stream.TradesList[last_number];
        var tradebefore = m_stream.TradesList[last_number - 1];

        return (trade.number - tradebefore.number == 1 && trade.rounddate == tradebefore.rounddate && trade.Direction == tradebefore.Direction);
    }


    public ClusterMachine(TradesStream stream, double period, decimal priceStep)
    {
        if (period == 3)
            trad = true;

        m_priceStep = priceStep;
        m_period = period;
        m_stream = stream;
        last_number = 0;
        m_span = TimeSpan.FromMinutes(period);
        UpdateStream();
    }
    public List<ClusterColumnWCF> GetClusters(DateTime start, DateTime end)
    {
        lock (ColumnList)
            return ColumnList.Where(v => (v.Date >= start && v.Date < end))
            .Select(v => v.ConvertToClusterColumnWCF())
            .ToList();
    }


    public List<ClusterColumnWCF> GetLastTrades()
    {

        var ts = TimeSpan.FromSeconds(5);
        var lastdate = ColumnList.LastOrDefault().Date;

        var position = ColumnList.Count - 1;

        while (position > 0 && (lastdate - ColumnList[position].Date) < ts)
            position--;

        lock (ColumnList)
        {
            return ColumnList.GetRange(position, ColumnList.Count - position).Select(v => v.ConvertToClusterColumnWCF()).ToList();
        }
    }

    public List<ClusterColumnWCF> GetLastClusters(int count)
    {

        if (trad)
            return GetLastTrades();


        lock (ColumnList)
        {
            count = Math.Min(count, ColumnList.Count);

            while (count > 1 && ColumnList[ColumnList.Count - 1].Date - (ColumnList[ColumnList.Count - count].Date) > TimeSpan.FromMinutes(10))
                count--;

            if (count > 0)
                return ColumnList.GetRange(ColumnList.Count - count, count).Select(v => v.ConvertToClusterColumnWCF()).ToList();
            //.TakeLastList(count).ToList();
            else
                return ColumnList.Select(v => v.ConvertToClusterColumnWCF()).ToList();
        }
    }

}

