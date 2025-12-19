using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PlayerOnline.DDEReciever
{
    public struct LCHI
    {
        public LCHI(string s)
        {
           var ss = s.Split(';');
            time = DateTime.Parse(ss[0]);
            ticker = ss[1].Trim();
            quantity = int.Parse(ss[2]);
            price = decimal.Parse( "0" + ss[3],  System.Globalization.CultureInfo.InvariantCulture);
        }

        public string ticker { get; set; }
        public DateTime time { get; set; }
        public int quantity { get; set; }
        public decimal price { get; set; }
    }
}
