using System.Collections.Generic;
using System;

namespace DataProvider.Models
{
    public class TradesStream
    {
        DateTime m_lastUpdate = DateTime.Now;
        public List<Trade> TradesList = new List<Trade>();
        public void PushTrade(Trade trade)
        {
            /*
            if (TradesList.Count > 0 && TradesList.Last().rounddate.Date != trade.rounddate.Date)
                TradesList.Clear();
            */
            /*
            if (lastdate.Date != trade.rounddate.Date)
               CleanUp();*/
            long minnumber = 0;
            if (TradesList.Count > 0)
                minnumber = TradesList[TradesList.Count - 1].number;
            if (trade.number > minnumber)
                TradesList.Add(trade);
        }
        struct cluster
        {
            public int Quantity;
            public int BuyQuantity;
        }
    }
}
