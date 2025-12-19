using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace PlayerOnline.DDEReciever.Robot
{
    public class log2
    {
        public log2(IRobot r, int comis)
        {
            PrcIn = r.inputPrice;
            PrcOut = r.lastTrade.Price;
            Qnt = r.contracts;
            timeIn = r.inputTrade.rounddate;
            time = r.lastTrade.rounddate;
            Comis = Math.Abs(r.contracts * comis);
            Delta = r.lastTrade.Price - r.inputPrice;
            Total = (r.lastTrade.Price - r.inputPrice) * Math.Sign(r.contracts) - Math.Abs(r.contracts * comis);
            IsStop = r.Mode != mode.WaitingInput;
            PotentialStopLoss = r.getPotentialStopLoss();
        }

        [JsonConverter(typeof(DateFormatConverter), "yyyy-MM-dd")]
        public DateTime timeIn { get; set; }
        public DateTime time { get; set; }
        public decimal PrcIn { get; set; }
        public decimal PrcOut { get; set; }
        public int Qnt { get; set; }
        public decimal Delta { get { return PrcOut - PrcIn; } set { } }
        public decimal Sbor { get; set; }
        public decimal Comis { get; set; }
        public decimal Total { get; set; }
        public bool IsStop { get; set; }

        public decimal PotentialStopLoss { get; set; }
    }
}
