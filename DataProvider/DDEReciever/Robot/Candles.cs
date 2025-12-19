using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PlayerOnline.DDEReciever.Robot
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Runtime.Serialization;
    [DataContract]
    public class CandlesReportWCF
    {

        int? baseOI = null;

        public CandlesReportWCF(Trade trade, decimal clsAvg, TimeSpan m_span, long delta, int oi)
        {

            int oi2 = (int)((baseOI.HasValue) ? trade.OI - baseOI : 0);

            if (!baseOI.HasValue)
                baseOI = trade.OI;

            ClsAvg = clsAvg;
            OpnPrice = ClsPrice = HiPrice = LoPrice = trade.Price;
            OpnDelta = ClsDelta = HiDelta = LoDelta = delta;

            OpnOI = ClsOI = HiOI = LoOI = oi;


            OpnOIV = ClsOIV = HiOIV = LoOIV = oi2;


            Volume = trade.Volume;
            BuyVolume = trade.Volume * trade.Direction;
            Quantity = trade.Quantity;
            BuyQuantity = trade.Quantity * trade.Direction;
            RoundDate = trade.rounddate.Floor(m_span);            
        }

        public void PushTrade(Trade trade, decimal clsAvg, long delta, int oi)
        {

            int oi2 = (int)((baseOI.HasValue) ? trade.OI - baseOI : 0);

            if (!baseOI.HasValue)
                baseOI = trade.OI;

            ClsAvg = clsAvg;
            
            
            ClsPrice = trade.Price;
            LoPrice = LoPrice < trade.Price ? LoPrice : trade.Price;
            HiPrice = HiPrice > trade.Price ? HiPrice : trade.Price;

            ClsOI = oi;
            LoOI = LoOI < oi ? LoOI : oi;
            HiOI = HiOI > oi ? HiOI : oi;


            ClsOIV = oi2;
            LoOIV = LoOIV < oi2 ? LoOIV : oi2;
            HiOIV = HiOIV > oi2 ? HiOIV : oi2;



            ClsDelta = delta;
            LoDelta = LoDelta < delta ? LoDelta : delta;
            HiDelta = HiDelta > delta ? HiDelta : delta;

            Volume += trade.Volume;
            BuyVolume += trade.Volume * trade.Direction;
            Quantity += trade.Quantity;
            BuyQuantity += trade.Quantity * trade.Direction;
            
        }


        
        
        
        
        [DataMember]
        public decimal OpnPrice;
        [DataMember]
        public decimal ClsPrice;
        [DataMember]
        public decimal LoPrice;
        [DataMember]
        public decimal HiPrice;



        [DataMember]
        public int OpnOI;
        [DataMember]
        public int ClsOI;
        [DataMember]
        public int LoOI;
        [DataMember]
        public int HiOI;



        [DataMember]
        public int OpnOIV;
        [DataMember]
        public int ClsOIV;
        [DataMember]
        public int LoOIV;
        [DataMember]
        public int HiOIV;


        [DataMember]
        public int OpnOIC;
        [DataMember]
        public int ClsOIC;
        [DataMember]
        public int LoOIC;
        [DataMember]
        public int HiOIC;

        [DataMember]
        public decimal OpnDelta;
        [DataMember]
        public decimal ClsDelta;
        [DataMember]
        public decimal LoDelta;
        [DataMember]
        public decimal HiDelta;










        [DataMember]
        public DateTime RoundDate;
        [DataMember]
        public decimal Volume;
        [DataMember]
        public decimal BuyVolume;
        [DataMember]
        public long Quantity;
        [DataMember]
        public long BuyQuantity;
        [DataMember]
        public int OI;

        public decimal ClsAvg;
    }
    public class CandlesMachine
    {
       
        volatile int last_number = 0;
        uint m_period;

      public  uint Period { get { return m_period; } }

        TimeSpan m_span;
        
        public List<CandlesReportWCF> CandlesList = new List<CandlesReportWCF>();

        int cnt = 0;
        


        public bool IsNew()
        {
            return cnt == 1;
        }

        int? baseOI = null;
        long delta = 0;



        public void PushTrade(Trade trade, decimal clsAvg)
        {
            delta += trade.Quantity * (trade.Direction == 1 ? 1 : -1);
            int oi = (int)((baseOI.HasValue) ? trade.OI - baseOI : 0);

            if(!baseOI.HasValue)
            baseOI = trade.OI;

            lock (CandlesList)
            {
                if (!CandlesList.Any() || CandlesList.Last().RoundDate != trade.rounddate.Floor(m_span))
                {
                    CandlesList.Add(new CandlesReportWCF(trade, clsAvg, m_span, delta, oi));
                    cnt = 0;
                }
                else
                {
                    CandlesList.Last().PushTrade(trade, clsAvg, delta, oi);
                 
                }

                cnt++;
            }
        }



        public CandlesMachine( uint period)
        {
            m_period = period;            
            m_span = TimeSpan.FromMinutes(period);
        }
        public List<CandlesReportWCF> GetCandles(DateTime start, DateTime end)
        {
            lock (CandlesList)
                return (from candle in CandlesList
                        where candle.RoundDate >= start && candle.RoundDate <= end
                        select candle).ToList();
        }



        public List<CandlesReportWCF> GetLastCandles(int count)
        {
            lock (CandlesList)
                return CandlesList.TakeLast(count).ToList();
        }
    }

}
