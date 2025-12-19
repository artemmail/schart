using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PlayerOnline.DDEReciever.Robot
{
    public interface IRobot
    {
        void pushTrade(Trade trade, decimal avg, decimal avgOI );

        public decimal getPotentialStopLoss();

        decimal currProfit();
        decimal inputPrice { get; }
        mode Mode { get; }
        

        public Trade lastTrade { get; }
        public Trade inputTrade { get; }
        public int contracts { get;  }

        public string Col { get; set; }
    }
}
