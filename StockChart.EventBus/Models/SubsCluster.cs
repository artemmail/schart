using System;
using System.Globalization;

namespace StockChart.EventBus.Models
{
    public class SubsCluster
    {
        public string ticker { get; set; }
        public double? period { get; set; }

        public decimal step { get; set; }

        public override int GetHashCode()
        {
            return ToString().GetHashCode();
        }
        public override bool Equals(object obj)
        {
            return (obj as SubsCluster).ticker == ticker && (obj as SubsCluster).period == period && (obj as SubsCluster).step == step;
        }
        public override string ToString()
        {
            return $"{ticker}_{Math.Round((period ?? 0) * 60)}_{step.ToString(CultureInfo.InvariantCulture)}";
        }

        public static SubsCluster Parse(string s)
        {
            string[] split = s.Split('_');
            return new SubsCluster()
            {
                ticker = split[0],
                period = int.Parse(split[1]) / 60.0f,
                step = decimal.Parse(split[2], CultureInfo.InvariantCulture)
            };
        }
    }

}


