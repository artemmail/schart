using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace PlayerOnline.DDEReciever.Robot
{
    public class log
    {
        [JsonConverter(typeof(DateFormatConverter), "yyyy-MM-dd")]
        public DateTime time { get; set; }
        public decimal Prc { get; set; }
        public int Qnt { get; set; }
        public bool Dir { get; set; }
        public string Col { get; set; }
        public bool IsStop { get; set; }

        public decimal PotentialStopLoss { get; set; }
    }

}
