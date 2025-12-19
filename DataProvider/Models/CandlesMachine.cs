using DataProvider.Models;
using StockChart.EventBus.Models;
using System;
using System.Collections.Generic;
using System.Linq;


public class CandlesMachine
{
    TradesStream m_stream;
    volatile int last_number = 0;
    double m_period;
    TimeSpan m_span;
    private
    List<BaseCandle> CandlesList = new List<BaseCandle>();

    bool trad = false;
    public void UpdateStream()
    {
        if (trad)
        {
            UpdateStream2();
            return;
        }

        lock (CandlesList)
            for (; last_number < m_stream.TradesList.Count; last_number++)
            {
                var trade = m_stream.TradesList[last_number];
                if (last_number == 0 || CandlesList.Last().Period != trade.rounddate.Floor(m_span))
                    CandlesList.Add(new CandleX(trade, m_span));
                else
                    (CandlesList.Last() as CandleX).PushTrade(trade);
            }
    }

    public bool thisCandle()
    {
        var trade = m_stream.TradesList[last_number];
        var tradebefore = m_stream.TradesList[last_number - 1];

        return (trade.number - tradebefore.number == 1 && trade.rounddate == tradebefore.rounddate && trade.Direction == tradebefore.Direction);
    }

    public void UpdateStream2()
    {
        lock (CandlesList)
            for (; last_number < m_stream.TradesList.Count; last_number++)
            {
                var trade = m_stream.TradesList[last_number];
                var tradebefore = m_stream.TradesList[last_number];

                if (last_number == 0 || !thisCandle())
                    CandlesList.Add(new CandleX(trade, TimeSpan.FromMinutes(0)));
                else
                    (CandlesList.Last() as CandleX).PushTrade(trade);
            }
    }


    public CandlesMachine(TradesStream stream, double period)
    {
        if (period == 3)
            trad = true;

        m_period = period;
        m_stream = stream;
        m_span = TimeSpan.FromMinutes(period);
        UpdateStream();
    }
    public List<BaseCandle> GetCandles(DateTime start, DateTime end)
    {
        lock (CandlesList)
            return CandlesList.Where(candle => candle.Period >= start && candle.Period < end).ToList();
    }
    public List<BaseCandle> GetLastCandles(int count)
    {
        if (trad)
            count = 100;

        lock (CandlesList)
        {
            count = Math.Min(count, CandlesList.Count);
            while (count > 1 && (CandlesList[CandlesList.Count - 1].Period - CandlesList[CandlesList.Count - count].Period) > TimeSpan.FromMinutes(10))
                count--;
            if (count > 0)
                return CandlesList.GetRange(CandlesList.Count - count, count);
            //.TakeLastList(count).ToList();
            else
                return CandlesList;
        }
    }

    public BaseCandle LastCandle()
    {
        lock (CandlesList)
        {
            return CandlesList.LastOrDefault();
        }
    }
}
