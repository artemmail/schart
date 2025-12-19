using StockChart.EventBus.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace DataProvider.Models
{
    public class ClusterColumn
    {
        int m_oi;
        decimal m_open;
        decimal m_close;
        decimal m_v;
        decimal m_bv;
        decimal m_q;
        decimal m_bq;
        decimal m_min;
        decimal m_max;
        DateTime m_rounddate;
        ConcurrentDictionary<decimal, Cluster> ColumnDictionary;// = new ConcurrentDictionary<decimal, Cluster>();
        ClusterMachine m_machine;
        public DateTime Date
        {
            get
            {
                return m_rounddate;
            }
        }
        public ClusterColumn(Trade trade, ClusterMachine machine)
        {
            m_machine = machine;
            m_min = m_max = m_open = trade.Price;
            m_close = trade.Price;
            m_oi = trade.OI;
            m_rounddate = trade.rounddate.Floor(m_machine.m_span);

            m_v = trade.Volume;
            m_q = trade.Quantity;

            m_bv = trade.Direction * trade.Volume;
            m_bq = trade.Direction * trade.Quantity;

            if (m_machine.m_priceStep > 0)
                ColumnDictionary = new ConcurrentDictionary<decimal, Cluster>();
        }
        public bool DateCompatibility(Trade trade)
        {
            /*
            if (ColumnDictionary.Count == 0)
                return true;
            else*/
            return m_rounddate.Floor(m_machine.m_span) == trade.rounddate.Floor(m_machine.m_span);
        }
        public void PushTrade(Trade trade)
        {
            /*
            if (ColumnDictionary.Count == 0)
            {
                m_min = m_max = m_open = trade.Price;
                m_close = trade.Price;
                m_oi = trade.OI;
                m_rounddate = trade.rounddate.Floor(m_machine.m_span);
                m_v = trade.Volume;
                m_bv = trade.Direction * trade.Volume;
                m_q = trade.Quantity;
                m_bv = trade.Direction * trade.Quantity;
            }
            else*/
            {
                m_close = trade.Price;
                m_min = Math.Min(m_min, trade.Price);
                m_max = Math.Max(m_max, trade.Price);
                m_oi = trade.OI;
                m_v += trade.Volume;
                m_bv += trade.Direction * trade.Volume;
                m_q += trade.Quantity;
                m_bq += trade.Direction * trade.Quantity;
            }

            if (m_machine.m_priceStep > 0)
            {
                decimal roundprice = Math.Round((trade.Price / m_machine.m_priceStep)) * m_machine.m_priceStep;
                if (ColumnDictionary.ContainsKey(roundprice))
                    ColumnDictionary[roundprice].Add(trade.Quantity, trade.Direction);
                else
                    ColumnDictionary[roundprice] = new Cluster(trade.Quantity, trade.Direction);
            }
        }






        public ClusterColumnWCF ConvertToClusterColumnWCF()
        {
            ClusterColumnWCF result = new ClusterColumnWCF()
            {
                x = m_rounddate,
                o = m_open,
                c = m_close,
                h = m_max,
                l = m_min,
                v = m_v,
                bq = m_bq,
                q = m_q,
                bv = m_bv,
                oi = m_oi
            };

            if (ColumnDictionary != null)
            {

                var list = new List<decimal>(ColumnDictionary.Keys);
                list.Sort();
                foreach (var v in list)
                {
                    result.cl.Add(
                       new cluster
                       {
                           p = v,
                           q = ColumnDictionary[v].q,
                           bq = ColumnDictionary[v].bq,
                           ct = ColumnDictionary[v].ct,
                           mx = ColumnDictionary[v].mx
                       }
                    );
                }
            }
            return result;
        }
    }
}
