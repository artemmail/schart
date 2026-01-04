using StockChart.EventBus.Models;
using StockChart.Model;

namespace StockChart.Extentions
{
    public class CandlePacker
    {
        public static void PackArray(decimal[] arr)
        {
            for (int i = arr.Length - 1; i > 0; i--)
                arr[i] = arr[i] - arr[i - 1];
        }
        public static void PackArray(long[] arr)
        {
            for (int i = arr.Length - 1; i > 0; i--)
                arr[i] = arr[i] - arr[i - 1];
        }
        public static CandlesRangeSetResult PackCandlesResult(List<Candle> candles, bool packed)
        {
            if (candles == null)
                return null;
            int len = candles.Count;
            //  int len2 = oiVolumes == null ? 0 : oiVolumes.Count;
            //        int ostart = 0;
            decimal[] Opn = new decimal[len];
            decimal[] Cls = new decimal[len];
            decimal[] Min = new decimal[len];
            decimal[] Max = new decimal[len];
            decimal[] Vol = new decimal[len];
            decimal[] Qnt = new decimal[len];
            int[] Bid = new int[len];
            long[] Date = new long[len];
            int[] OIn = new int[len];
            for (int i = 0; i < len; i++)
            {
                Opn[i] = candles[i].OpnPrice;
                Cls[i] = candles[i].ClsPrice;
                Min[i] = candles[i].MinPrice;
                Max[i] = candles[i].MaxPrice;
                Vol[i] = candles[i].Volume;
                OIn[i] = candles[i].Oi;
                Qnt[i] = candles[i].Quantity;
                if (Vol[i] > 0)
                    Bid[i] = (int)Math.Truncate(1000 * candles[i].BuyVolume / candles[i].Volume);// / 1000.0f;                
                Date[i] = candles[i].Period.ToJavaScriptMinutes();
            }
            if (packed)
            {
                PackArray(Min);
                PackArray(Max);
                PackArray(Opn);
                PackArray(Cls);
                PackArray(Date);
            }
            if (OIn.Any() && OIn.Max() > 0)
            {
                for (int i = 1; i < OIn.Length; i++)
                    if (OIn[i] == 0)
                        OIn[i] = OIn[i - 1];
                for (int i = OIn.Length - 2; i > 1; i--)
                    if (OIn[i] == 0)
                        OIn[i] = OIn[i + 1];
                return new CandlesRangeSetResult
                {
                    Min = Min,
                    Max = Max,
                    Opn = Opn,
                    Cls = Cls,
                    Vol = Vol,
                    Qnt = Qnt,
                    Bid = Bid,
                    Date = Date,
                    OpIn = OIn
                };
            }
            else
                return new CandlesRangeSetResult
                {
                    Min = Min,
                    Max = Max,
                    Opn = Opn,
                    Cls = Cls,
                    Vol = Vol,
                    Qnt = Qnt,
                    Bid = Bid,
                    Date = Date
                };
        }

        public static CandlesRangeSetValue[] PackCandlesResultArray(List<BaseCandle> candles)
        {
            if (candles == null)
                return null;

            var values = candles.Select(candle => new CandlesRangeSetValue
            {
                Price1 = candle.ClsPrice,
                Price2 = candle.ClsPrice,
                Date = candle.Period
            }).ToArray();

            return values;
        }

        public static CandlesRangeSetValue[] PackPricesResultArray(BaseCandle[] prices1, BaseCandle[] prices2)
        {
            if (prices1 == null || prices2 == null)
                return null;

            var values = prices1.Zip(prices2, (p1, p2) => new CandlesRangeSetValue
            {
                Price1 = p1.ClsPrice,
                Price2 = p2.ClsPrice,
                Date = p1.Period
            }).ToArray();

            return values;
        }


        public static CandlesRangeSetResult PackCandlesResult(List<BaseCandle> candles, bool packed)
        {
            if (candles == null)
                return null;
            int len = candles.Count;
            //  int len2 = oiVolumes == null ? 0 : oiVolumes.Count;
            //        int ostart = 0;
            decimal[] Opn = new decimal[len];
            decimal[] Cls = new decimal[len];
            decimal[] Min = new decimal[len];
            decimal[] Max = new decimal[len];
            decimal[] Vol = new decimal[len];
            decimal[] Qnt = new decimal[len];
            int[] Bid = new int[len];
            long[] Date = new long[len];
            int[] OIn = new int[len];
            for (int i = 0; i < len; i++)
            {
                Opn[i] = candles[i].OpnPrice;
                Cls[i] = candles[i].ClsPrice;
                Min[i] = candles[i].MinPrice;
                Max[i] = candles[i].MaxPrice;
                Vol[i] = candles[i].Volume;
                OIn[i] = candles[i].Oi;
                Qnt[i] = candles[i].Quantity;
                if (Vol[i] > 0)
                    Bid[i] = (int)Math.Truncate(1000 * candles[i].BuyVolume / candles[i].Volume);// / 1000.0f;                
                Date[i] = candles[i].Period.ToJavaScriptMinutes();
            }
            if (packed)
            {
                PackArray(Min);
                PackArray(Max);
                PackArray(Opn);
                PackArray(Cls);
                PackArray(Date);
            }
            if (OIn.Any() && OIn.Max() > 0)
            {
                for (int i = 1; i < OIn.Length; i++)
                    if (OIn[i] == 0)
                        OIn[i] = OIn[i - 1];
                for (int i = OIn.Length - 2; i > 1; i--)
                    if (OIn[i] == 0)
                        OIn[i] = OIn[i + 1];
                return new CandlesRangeSetResult
                {
                    Min = Min,
                    Max = Max,
                    Opn = Opn,
                    Cls = Cls,
                    Vol = Vol,
                    Qnt = Qnt,
                    Bid = Bid,
                    Date = Date,
                    OpIn = OIn
                };
            }
            else
                return new CandlesRangeSetResult
                {
                    Min = Min,
                    Max = Max,
                    Opn = Opn,
                    Cls = Cls,
                    Vol = Vol,
                    Qnt = Qnt,
                    Bid = Bid,
                    Date = Date
                };
        }
    }
}
