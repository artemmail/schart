using StockChart.EventBus.Models;
using System;
namespace DataProvider.Models
{
    public class CandleX : BaseCandle
    {
        public CandleX(Trade trade, TimeSpan m_span)
        {
            OpnPrice = ClsPrice = MaxPrice = MinPrice = trade.Price;
            Volume = trade.Volume;
            BuyVolume = trade.Volume * trade.Direction;
            Quantity = trade.Quantity;
            BuyQuantity = trade.Quantity * trade.Direction;
            Period = trade.rounddate.Floor(m_span);
            Oi = trade.OI;
        }
        public void PushTrade(Trade trade)
        {
            ClsPrice = trade.Price;
            MinPrice = MinPrice < trade.Price ? MinPrice : trade.Price;
            MaxPrice = MaxPrice > trade.Price ? MaxPrice : trade.Price;
            Volume += trade.Volume;
            BuyVolume += trade.Volume * trade.Direction;
            Quantity += trade.Quantity;
            BuyQuantity += trade.Quantity * trade.Direction;
            Oi = trade.OI;
        }
        /*  public decimal OpnPrice { get; private set; }
          public decimal ClsPrice { get; private set; }
          public decimal MinPrice { get; private set; }
          public decimal MaxPrice { get; private set; }
          public DateTime RoundDate { get; private set; }
          public decimal Volume { get; private set; }
          public decimal BuyVolume { get; private set; }
          public decimal Quantity { get; private set; }
          public decimal BuyQuantity { get; private set; }
          public int Oi { get; private set; }*/
    }


}
