using System;

namespace StockChart.EventBus.Models
{
    public class SubsCandle
    {
        public string ticker { get; set; }
        public double? period { get; set; }

        public override int GetHashCode()
        {
            return ToString().GetHashCode();
        }
        public override bool Equals(object obj)
        {
            return (obj as SubsCandle).ticker == ticker && (obj as SubsCandle).period == period;
        }
        public override string ToString()
        {
            return ticker + "_" + (Math.Round(period.Value * 60)).ToString();
        }

        public static SubsCandle Parse(string s)
        {
            string[] split = s.Split('_');
            return new SubsCandle()
            {
                ticker = split[0],
                period = int.Parse(split[1]) / 60.0f
            };
        }
    }

}
