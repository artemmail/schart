namespace StockChart.Model
{
    public class CandlesStatistic
    {
        public struct Indicator
        {
            public DateTime Date;
            public double Value;
        }
        List<Candle> m_candles;
        Indicator[] TR;
        public Indicator[] ATR;
        dynamic Max3(dynamic v1, dynamic v2, dynamic v3)
        {
            return Math.Max(v1, Math.Max(v2, v3));
        }
        void ComputeTR()
        {
            TR = new Indicator[m_candles.Count];
            for (int i = 0; i < m_candles.Count; i++)
                TR[i].Date = m_candles[i].Period;
            TR[0].Value = (double)Max3(
                    m_candles[0].MaxPrice - m_candles[0].MinPrice,
                    Math.Abs(m_candles[0].MaxPrice - m_candles[0].OpnPrice),
                    Math.Abs(m_candles[0].MinPrice - m_candles[0].OpnPrice)
                    );
            for (int i = 1; i < m_candles.Count; i++)
                TR[i].Value = (double)Max3(
                    m_candles[i].MaxPrice - m_candles[i].MinPrice,
                    Math.Abs(m_candles[i].MaxPrice - m_candles[i - 1].ClsPrice),
                    Math.Abs(m_candles[i].MinPrice - m_candles[i - 1].ClsPrice)
                    );
        }
        void ComputeATR()
        {
            ComputeTR();
            int N = m_candles.Count;
            ATR = new Indicator[m_candles.Count];
            for (int i = 0; i < m_candles.Count; i++)
                ATR[i].Date = m_candles[i].Period;
            ATR[0].Value = (from x in TR select x.Value).Sum() / N;
            for (int i = 1; i < N; i++)
                ATR[i].Value = (ATR[i - 1].Value * (N - 1) + TR[i].Value) / N;
        }
        public CandlesStatistic(List<Candle> candles)
        {
            m_candles = candles;
            ComputeATR();
        }
        int CandlesCount()
        {
            return m_candles.Count;
        }
        int GrowCandlesCount()
        {
            return m_candles.Count(i => i.OpnPrice <= i.ClsPrice);
        }
        int FallCandlesCount()
        {
            return m_candles.Count(i => i.OpnPrice < i.ClsPrice);
        }
        int DatesCount()
        {
            return (from pet in m_candles
                    group pet.Period.Date by pet.Period.Date
                        ).Count();
        }
        public object SeriesStat()
        {
            Dictionary<int, int> seriesDic = new Dictionary<int, int>();

            if (m_candles.Count == 0)
                return new { Grow = new List<object>(), Fall = new List<object>() };

            int sign = m_candles[0].OpnPrice <= m_candles[0].ClsPrice ? 1 : -1;
            int seriesLength = 1;

            for (int i = 1; i < m_candles.Count; i++)
            {
                int currentSign = m_candles[i].OpnPrice <= m_candles[i].ClsPrice ? 1 : -1;

                if (currentSign == sign)
                {
                    seriesLength++;
                }
                else
                {
                    if (seriesDic.ContainsKey(seriesLength * sign))
                        seriesDic[seriesLength * sign]++;
                    else
                        seriesDic[seriesLength * sign] = 1;

                    seriesLength = 1;
                    sign = currentSign;
                }
            }

            if (seriesDic.ContainsKey(seriesLength * sign))
                seriesDic[seriesLength * sign]++;
            else
                seriesDic[seriesLength * sign] = 1;

            // var s = seriesDic.Keys.Sum(x => Math.Abs(x) * seriesDic[x]);

            var grow = seriesDic.Where(kv => kv.Key > 0)
                                .OrderBy(kv => kv.Key)
                                .Select(kv => new { Candles = kv.Key, Count = kv.Value })
                                .ToList();

            var fall = seriesDic.Where(kv => kv.Key < 0)
                                .OrderBy(kv => kv.Key)
                                .Select(kv => new { Candles = kv.Key, Count = kv.Value })
                                .ToList();

            return new { Grow = grow, Fall = fall };
        }


        public List<object> GroupByTime()
        {
            //   Func<DateTime, decimal> myFunc = (DateTime d) => (from p in m_candles where p.Period == d select p.Volume).Sum();
            return (from pet in m_candles
                    group pet.Period.TimeOfDay by pet.Period.TimeOfDay into
                    aww
                    from x in aww.Distinct()
                    orderby x
                    select (object)(new
                    {
                        Volume =
                        (from p in m_candles where p.Period.TimeOfDay == x select p.Quantity).Average()
                        ,
                        Date = x.ToString(@"h\:mm")
                    })
                    ).ToList();
        }
        public List<object> AtrStat()
        {
            //   Func<DateTime, decimal> myFunc = (DateTime d) => (from p in m_candles where p.Period == d select p.Volume).Sum();
            return (from p in ATR
                    group p.Date.TimeOfDay by p.Date.TimeOfDay into
                    aww
                    from x in aww.Distinct()
                    orderby x
                    select (object)(new
                    {
                        Min =
                            (from p in ATR where p.Date.TimeOfDay == x select p.Value).Min()
                        ,
                        Max =
                            (from p in ATR where p.Date.TimeOfDay == x select p.Value).Max()
                        ,
                        Avg =
                            (from p in ATR where p.Date.TimeOfDay == x select p.Value).Average()
                        ,
                        Date = x.ToString(@"h\:mm")
                    })
                    ).ToList();
        }
    }
}