
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace PlayerOnline.DDEReciever.Robot
{


    public class RobotCandles : IRobot
    {

        public bool inverted;
        public decimal averageDeltaMin;
        public decimal averageDeltaMax;


        public decimal takeProfit;
        public decimal? stopLoss;
        public decimal? stopLossStack;


        public decimal? stopProfit;

        decimal maxTakeProfit;
        public Trade lastTrade { get; set; }
        public Trade inputTrade { get; set; }
        public mode Mode { get; set; }
        public int contracts { get; set; }
        public RobotContainer parent;
        public string Col { get; set; }

        public uint period;

        CandlesMachine candlesMachine;


        public string ColSwitch;
        public string ColTemp;

        public decimal? AvgOpnFrom;
        public decimal? AvgOpnTo;
        public decimal? AvgClsFrom;
        public decimal? AvgClsTo;
        public decimal? AvgHiFrom;
        public decimal? AvgHiTo;
        public decimal? AvgLowFrom;
        public decimal? AvgLowTo;

        public decimal? AvgOIOpnFrom;
        public decimal? AvgOIOpnTo;
        public decimal? AvgOIClsFrom;
        public decimal? AvgOIClsTo;
        public decimal? AvgOIHiFrom;
        public decimal? AvgOIHiTo;
        public decimal? AvgOILowFrom;
        public decimal? AvgOILowTo;

        public decimal? PrevAvgOpnFrom;
        public decimal? PrevAvgOpnTo;
        public decimal? PrevAvgClsFrom;
        public decimal? PrevAvgClsTo;
        public decimal? PrevAvgHiFrom;
        public decimal? PrevAvgHiTo;
        public decimal? PrevAvgLowFrom;
        public decimal? PrevAvgLowTo;

        public decimal? PrevAvgOIOpnFrom;
        public decimal? PrevAvgOIOpnTo;
        public decimal? PrevAvgOIClsFrom;
        public decimal? PrevAvgOIClsTo;
        public decimal? PrevAvgOIHiFrom;
        public decimal? PrevAvgOIHiTo;
        public decimal? PrevAvgOILowFrom;
        public decimal? PrevAvgOILowTo;


        public bool StopLossOpen = false;

        public int? TradeLastSeconds;






        public bool DoubleEnter = true;
        public bool DoubleEnterLong = true;
        public bool DoubleEnterShort = true;


        public decimal? MinContracts;
        public decimal? OpnClsDelta;
        public decimal? HiLowDelta;

        public decimal? StopCandle;

        public bool stopProfitMode;


        public bool AvgFirst = false;
        public bool MinMaxFirst = false;
        public decimal? Delta;

        public decimal? DeltaV;

        public decimal CurrDelta = 0;
        public decimal CurrDeltaV = 0;


        public decimal totalProfit;

        public bool GreedyStopProfit = false;


        public bool StopCoup = false;

        public bool CowardRabbit = false;

        public bool DeltaMinMax = false;
        public bool OIMinMax = false;
       
        decimal? LastLong = null;
        decimal? LastShort = null;

        public int? OIV = null;
        public int? OIV2 = null;

        public bool Double2 = false;


        public bool stopProfitNew = false;


        public decimal? LongIfMore = null;
        public decimal? ShortIfLess = null;

        public decimal? stopProfitEx
        {

            get
            {
                if (stopProfitNew)
                {
                    //if (Mode == mode.WaitingProfitLong)


                        return stopLossLevel2;
                }
                else

                return stopProfit;
                /*
                if (!GreedyStopProfit || totalProfit >=0)
                    return stopProfit;

                return Math.Max((decimal)stopProfit, (decimal)(-totalProfit));*/
            }
        }

        public decimal? StopToProfit = null;



        public decimal takeProfitEx
        {
            get
            {
                if (StopToProfit.HasValue)
                {
                    var r = StopToProfit.Value * potentialStopLoss;
                    return r;
                }

                if (GreedyStopProfit && totalProfit <= stopLoss)
                    return (decimal)(-totalProfit);

                return takeProfit;
            }
        }

        public RobotCandles(RobotContainer parent, uint period)
        {

            candlesMachine = new CandlesMachine(period);
            this.parent = parent;
            Mode = mode.WaitingInput;
            ColTemp = Col;
            stopProfitMode = false;
            totalProfit = 0;


        }

        public decimal currProfit()
        {
            var r = (lastTrade.Price - inputPrice) * Math.Sign(contracts);
            return r;
        }


        public decimal inputPrice { get { return inputTrade.Price; } }


        decimal minInput = 0;
        decimal maxInput = 0;


        public void SetCol()
        {
            Col = ColSwitch;

        }

        public void setContracts()
        {
            Col = ColTemp;
            contracts = Math.Abs(contracts);
            if (Mode == mode.WaitingProfitShort)
                contracts *= -1;
        }
        /*

        2. "DeltaMinMax" 
пример "DeltaMinMax": true, сравниваем значение Hi предыдущей свечи со значением Cls текущей свечи.
            Входим в сделку если Cls текущий выше Hi пред, то лонг, если Cls текущий ниже Lo пред, то шорт.
    Тело свечи должно быть >= 50% диапазона свечи от Hi до Lo. Если не соблюдаются условия, то не входит.
        */
     
        bool checkDeltaMinMax(List<CandlesReportWCF> can, bool islong)  {

            if (!checkOIMinMax(can))
                return false;

            
            var c = can.Last();

            if (OIV.HasValue && c.ClsOI < OIV.Value)
                return false;

            if (OIV2.HasValue && c.ClsOIV < OIV2.Value)
                return false;


            if (!DeltaMinMax)
                return true;


            if (Math.Abs(c.OpnDelta - c.ClsDelta) / (c.HiDelta - c.LoDelta) < 0.5m)
                return false;

            var b = islong ?  (can[0].HiDelta < can[1].ClsDelta) : (can[0].LoDelta > can[1].ClsDelta);
            return b;
        }


        
////5.  "OIV": 10, для входа ОИ должен быть только положительным, если отриц то не входим.задаем мин значение ОИ

        bool checkOIMinMax(List<CandlesReportWCF> can, bool islong = true)
        {
            

            if (!OIMinMax)
                return true;                      
            return can[1].ClsOI > can[0].HiOI;            
        }
        
        public bool CheckLong(Trade trade, decimal avg, decimal AvgOI)
        {
            if (LongIfMore.HasValue && trade.Price < LongIfMore.Value)
                return false;


            if (Double2 && minPriceOld.HasValue && minPrice == minPriceOld)
                return false;

            if (MinMaxDay)
                if (maxPrice > trade.Price)
                    return false;


            if (MinMaxCloseDay)
                if (!HiHi.HasValue || trade.Price < HiHi.Value)
                    return false;
            

            if (!DoubleEnterLong && LastLong > trade.Price)
                return false;

            if (DoNotInputTwice())
                return false;

            var can = candlesMachine.GetLastCandles(2);

            if (StopLossOpen && can.Last().OpnPrice > trade.Price)
                return false;


            
               if (can.Count == 2)
            {
                var firstCandle = candlesMachine.CandlesList[0];
                if (AvgFirst && firstCandle.ClsAvg > can[1].ClsAvg)
                    return false;

                if (MinMaxFirst && firstCandle.HiPrice > can[1].HiPrice)
                    return false;

                if (Delta.HasValue && CurrDelta < Delta)
                    return false;

                if (DeltaV.HasValue && !(Math.Abs(CurrDeltaV) >= DeltaV && CurrDeltaV > 0))
                    return false;


                if (can[0].HiPrice < can[1].ClsPrice && isMainBody()          )
                {
                    var xx = can[1];

                    if ((MinContracts.HasValue && xx.Quantity < MinContracts))
                        return false;

                    if ((OpnClsDelta.HasValue && Math.Abs(xx.OpnPrice - xx.ClsPrice) <= OpnClsDelta))
                        return false;

                    if ((HiLowDelta.HasValue && Math.Abs(xx.HiPrice - xx.LoPrice) >= HiLowDelta))
                        return false;

                    if (AvgOpnFrom.HasValue && xx.OpnPrice - avg <= AvgOpnFrom.Value)
                        return false;

                    if (AvgClsFrom.HasValue && xx.ClsPrice - avg <= AvgClsFrom.Value)
                        return false;

                    if (AvgHiFrom.HasValue && xx.HiPrice - avg <= AvgHiFrom.Value)
                        return false;

                    if (AvgLowFrom.HasValue && xx.OpnPrice - avg <= AvgLowFrom.Value)
                        return false;

                    if (AvgOpnTo.HasValue && xx.OpnPrice - avg >= AvgOpnTo.Value)
                        return false;

                    if (AvgClsTo.HasValue && xx.ClsPrice - avg >= AvgClsTo.Value)
                        return false;

                    if (AvgHiTo.HasValue && xx.HiPrice - avg >= AvgHiTo.Value)
                        return false;

                    if (AvgLowTo.HasValue && xx.OpnPrice - avg >= AvgLowTo.Value)
                        return false;

                    if (AvgOIOpnFrom.HasValue && xx.OpnPrice - AvgOI <= AvgOIOpnFrom.Value)
                        return false;

                    if (AvgOIClsFrom.HasValue && xx.ClsPrice - AvgOI <= AvgOIClsFrom.Value)
                        return false;

                    if (AvgOIHiFrom.HasValue && xx.HiPrice - AvgOI <= AvgOIHiFrom.Value)
                        return false;

                    if (AvgOILowFrom.HasValue && xx.OpnPrice - AvgOI <= AvgOILowFrom.Value)
                        return false;

                    if (AvgOIOpnTo.HasValue && xx.OpnPrice - AvgOI >= AvgOIOpnTo.Value)
                        return false;

                    if (AvgOIClsTo.HasValue && xx.ClsPrice - AvgOI >= AvgOIClsTo.Value)
                        return false;

                    if (AvgOIHiTo.HasValue && xx.HiPrice - AvgOI >= AvgOIHiTo.Value)
                        return false;

                    if (AvgOILowTo.HasValue && xx.OpnPrice - AvgOI >= AvgOILowTo.Value)
                        return false;



                    if (can.Count >= 2)
                    {
                        var xxx = can[0];



                        if (PrevAvgOpnFrom.HasValue && -(avg - xxx.OpnPrice) <= PrevAvgOpnFrom.Value)
                            return false;

                        if (PrevAvgClsFrom.HasValue && -(avg - xxx.ClsPrice) <= PrevAvgClsFrom.Value)
                            return false;

                        if (PrevAvgHiFrom.HasValue && -(avg - xxx.HiPrice) <= PrevAvgHiFrom.Value)
                            return false;

                        if (PrevAvgLowFrom.HasValue && -(avg - xxx.OpnPrice) <= PrevAvgLowFrom.Value)
                            return false;

                        if (PrevAvgOpnTo.HasValue && -(avg - xxx.OpnPrice) >= PrevAvgOpnTo.Value)
                            return false;

                        if (PrevAvgClsTo.HasValue && -(avg - xxx.ClsPrice) >= PrevAvgClsTo.Value)
                            return false;

                        if (PrevAvgHiTo.HasValue && -(avg - xxx.HiPrice) >= PrevAvgHiTo.Value)
                            return false;

                        if (PrevAvgLowTo.HasValue && -(avg - xxx.OpnPrice) >= PrevAvgLowTo.Value)
                            return false;

                        if (PrevAvgOIOpnFrom.HasValue && -(AvgOI - xxx.OpnPrice) <= PrevAvgOIOpnFrom.Value)
                            return false;

                        if (PrevAvgOIClsFrom.HasValue && -(AvgOI - xxx.ClsPrice) <= PrevAvgOIClsFrom.Value)
                            return false;

                        if (PrevAvgOIHiFrom.HasValue && -(AvgOI - xxx.HiPrice) <= PrevAvgOIHiFrom.Value)
                            return false;

                        if (PrevAvgOILowFrom.HasValue && -(AvgOI - xxx.OpnPrice) <= PrevAvgOILowFrom.Value)
                            return false;

                        if (PrevAvgOIOpnTo.HasValue && -(AvgOI - xxx.OpnPrice) >= PrevAvgOIOpnTo.Value)
                            return false;

                        if (PrevAvgOIClsTo.HasValue && -(AvgOI - xxx.ClsPrice) >= PrevAvgOIClsTo.Value)
                            return false;

                        if (PrevAvgOIHiTo.HasValue && -(AvgOI - xxx.HiPrice) >= PrevAvgOIHiTo.Value)
                            return false;

                        if (PrevAvgOILowTo.HasValue && -(AvgOI - xxx.OpnPrice) >= PrevAvgOILowTo.Value)
                            return false;


                        if (!checkDeltaMinMax(can, true))
                            return false;


                    }





                    return true;
                }
            }
            return false;
        }

        public bool MainBody = false;


        public bool isMainBody()
        {
            if (MainBody)
            {
                const decimal V = 0.5m;
                return Math.Abs((can[1].OpnPrice - can[1].ClsPrice) / (can[1].HiPrice - can[1].LoPrice)) > V;
            }
            return true;
        }

        //List<CandlesReportWCF> can;

        public bool CheckShort(Trade trade, decimal avg, decimal AvgOI)
        {

            if (ShortIfLess.HasValue && trade.Price > ShortIfLess.Value)
                return false;

            if (Double2 && maxPriceOld.HasValue && maxPrice == maxPriceOld)
                return false;

            

            if (MinMaxDay)
                if (minPrice < trade.Price)
                    return false;


            if (!DoubleEnterShort && LastShort < trade.Price)
                return false;


            if (MinMaxCloseDay)
                if (!LoLo.HasValue || trade.Price > LoLo.Value)
                    return false;


            can = candlesMachine.GetLastCandles(2);



            if (StopLossOpen && can.Last().OpnPrice < trade.Price)
                return false;

            




            if (can.Count == 2)
            {

            


                var firstCandle = candlesMachine.CandlesList[0];
                if (AvgFirst && firstCandle.ClsAvg < can[1].ClsAvg)
                    return false;

                if (MinMaxFirst && firstCandle.LoPrice < can[1].LoPrice)
                    return false;

                if (Delta.HasValue && CurrDelta > -Delta)
                    return false;



                if (DeltaV.HasValue && ! (Math.Abs(CurrDeltaV) >= DeltaV  && CurrDeltaV < 0 )  )
                    return false;

                if (can[0].LoPrice > can[1].ClsPrice && isMainBody())// &&
                    ///can[0].LoPrice > can[1].LoPrice)
                {
                    var xx = can[1];

                    if ((MinContracts.HasValue && xx.Quantity < MinContracts))
                        return false;

                    if ((OpnClsDelta.HasValue && Math.Abs(xx.OpnPrice - xx.ClsPrice) <= OpnClsDelta))
                        return false;

                    if ((HiLowDelta.HasValue && Math.Abs(xx.HiPrice - xx.LoPrice) >= HiLowDelta))
                        return false;


                    if (AvgOpnFrom.HasValue && avg - xx.OpnPrice <= AvgOpnFrom.Value)
                        return false;

                    if (AvgClsFrom.HasValue && avg - xx.ClsPrice <= AvgClsFrom.Value)
                        return false;

                    if (AvgHiFrom.HasValue && avg - xx.HiPrice <= AvgHiFrom.Value)
                        return false;

                    if (AvgLowFrom.HasValue && avg - xx.OpnPrice <= AvgLowFrom.Value)
                        return false;

                    if (AvgOpnTo.HasValue && avg - xx.OpnPrice >= AvgOpnTo.Value)
                        return false;

                    if (AvgClsTo.HasValue && avg - xx.ClsPrice >= AvgClsTo.Value)
                        return false;

                    if (AvgHiTo.HasValue && avg - xx.HiPrice >= AvgHiTo.Value)
                        return false;

                    if (AvgLowTo.HasValue && avg - xx.OpnPrice >= AvgLowTo.Value)
                        return false;

                    if (AvgOIOpnFrom.HasValue && AvgOI - xx.OpnPrice <= AvgOIOpnFrom.Value)
                        return false;

                    if (AvgOIClsFrom.HasValue && AvgOI - xx.ClsPrice <= AvgOIClsFrom.Value)
                        return false;

                    if (AvgOIHiFrom.HasValue && AvgOI - xx.HiPrice <= AvgOIHiFrom.Value)
                        return false;

                    if (AvgOILowFrom.HasValue && AvgOI - xx.OpnPrice <= AvgOILowFrom.Value)
                        return false;

                    if (AvgOIOpnTo.HasValue && AvgOI - xx.OpnPrice >= AvgOIOpnTo.Value)
                        return false;

                    if (AvgOIClsTo.HasValue && AvgOI - xx.ClsPrice >= AvgOIClsTo.Value)
                        return false;

                    if (AvgOIHiTo.HasValue && AvgOI - xx.HiPrice >= AvgOIHiTo.Value)
                        return false;

                    if (AvgOILowTo.HasValue && AvgOI - xx.OpnPrice >= AvgOILowTo.Value)
                        return false;







                    if (can.Count >= 2)
                    {
                        var xxx = can[0];

                        if (PrevAvgOpnFrom.HasValue && avg - xxx.OpnPrice <= PrevAvgOpnFrom.Value)
                            return false;

                        if (PrevAvgClsFrom.HasValue && avg - xxx.ClsPrice <= PrevAvgClsFrom.Value)
                            return false;

                        if (PrevAvgHiFrom.HasValue && avg - xxx.HiPrice <= PrevAvgHiFrom.Value)
                            return false;

                        if (PrevAvgLowFrom.HasValue && avg - xxx.OpnPrice <= PrevAvgLowFrom.Value)
                            return false;

                        if (PrevAvgOpnTo.HasValue && avg - xxx.OpnPrice >= PrevAvgOpnTo.Value)
                            return false;

                        if (PrevAvgClsTo.HasValue && avg - xxx.ClsPrice >= PrevAvgClsTo.Value)
                            return false;

                        if (PrevAvgHiTo.HasValue && avg - xxx.HiPrice >= PrevAvgHiTo.Value)
                            return false;

                        if (PrevAvgLowTo.HasValue && avg - xxx.OpnPrice >= PrevAvgLowTo.Value)
                            return false;

                        if (PrevAvgOIOpnFrom.HasValue && AvgOI - xxx.OpnPrice <= PrevAvgOIOpnFrom.Value)
                            return false;

                        if (PrevAvgOIClsFrom.HasValue && AvgOI - xxx.ClsPrice <= PrevAvgOIClsFrom.Value)
                            return false;

                        if (PrevAvgOIHiFrom.HasValue && AvgOI - xxx.HiPrice <= PrevAvgOIHiFrom.Value)
                            return false;

                        if (PrevAvgOILowFrom.HasValue && AvgOI - xxx.OpnPrice <= PrevAvgOILowFrom.Value)
                            return false;

                        if (PrevAvgOIOpnTo.HasValue && AvgOI - xxx.OpnPrice >= PrevAvgOIOpnTo.Value)
                            return false;

                        if (PrevAvgOIClsTo.HasValue && AvgOI - xxx.ClsPrice >= PrevAvgOIClsTo.Value)
                            return false;

                        if (PrevAvgOIHiTo.HasValue && AvgOI - xxx.HiPrice >= PrevAvgOIHiTo.Value)
                            return false;

                        if (PrevAvgOILowTo.HasValue && AvgOI - xxx.OpnPrice >= PrevAvgOILowTo.Value)
                            return false;

                        if (!checkDeltaMinMax(can, false))
                            return false;


                    }












                    return true;
                }
            }
            return false;
        }


        decimal firstPrice = -1;

        DateTime LastInput = DateTime.Now;

        public decimal GetPotentialStopLossValue(Trade trade, bool Long)
        {
            if (StopLossOpenCandle)
            {
                if (Long)
                    return Math.Abs(trade.Price - candleOpen);
                else
                    return Math.Abs(candleOpen - trade.Price);
            }

            
            if (Long)
                return Math.Abs(trade.Price - minPrice.Value);
            else
                return Math.Abs(maxPrice.Value - trade.Price);
        }


        decimal stopLossLevel2 = 0;


        decimal candleOpen = 0;

        public void TradeIn(Trade trade)
        {

            candleOpen = can.Last().OpnPrice;

            if (Mode == mode.WaitingProfitLong)
            {
                LastLong = trade.Price;
                maxPriceOld = maxPrice;
                potentialStopLoss = GetPotentialStopLossValue(trade, true);

                stopLossLevel2 = trade.Price + potentialStopLoss;
            }
            else
            {
                LastShort = trade.Price;
                minPriceOld = minPrice;
                potentialStopLoss = GetPotentialStopLossValue(trade, false);
                stopLossLevel2 = trade.Price - potentialStopLoss;
            }

            stopLoss = stopLossStack;
            inputTrade = trade;
            parent.TradeIn(this);
            LastInput = can.Last().RoundDate;
            stopFlag = true;
            firstPrice = can.Last().OpnPrice;
        }

        public bool DoNotInputTwice()
        {
            return (LastInput == can.Last().RoundDate);
        }


        List<CandlesReportWCF> can;


        bool stopFlag = true;


        decimal mid = 0;






        decimal delta = 0;


        decimal midC = 0;

        decimal midd = 0;
        decimal qq = 0;


        decimal OIdelta = 0;
        decimal sumPDP = 0;
        private decimal sumDelta;
        decimal prevOI = 0;

        private int totalQ;


        int q = 0;




        public decimal  PushTrade(Trade trade)
        {
            mid += trade.Price * trade.Quantity;
            q += trade.Quantity;




            decimal oidelta = 0;



            if (prevOI == 0)
            {
                sumPDP = 0;
                sumDelta = 0;
                totalQ = trade.Quantity;
                midC = 0;
            }
            else
            {
                oidelta = /*Math.abs*/(prevOI - trade.OI);
                midC += trade.Price * oidelta;
                sumDelta += oidelta;
                totalQ += trade.Quantity;
            }

            var p = trade.Price;
            p = delta;
            var MID1 = (sumDelta + totalQ) != 0 ? (mid + midC) / (sumDelta + totalQ) : 0;
            var AvgOI = sumDelta != 0 ? (midC) / (sumDelta) : 0;

            prevOI = trade.OI;

            return mid / q;

        }

        public int? RestartDeltaMin;
        public int? RestartDeltaMax;


         decimal? minPrice = null;
         decimal? maxPrice = null;

        decimal? minPriceOld = null;
        decimal? maxPriceOld = null;


        decimal? HiHi = null;
        decimal? LoLo = null;


        public bool MinMaxDay = false;
        public bool MinMaxCloseDay = false;


        public bool StopLossMinMaxDay = false;
        public bool StopLossOpenCandle = false;






        decimal potentialStopLoss = 0;

        public decimal getPotentialStopLoss()
        {
            return potentialStopLoss;
        }

        public void pushTrade(Trade trade, decimal avg, decimal avgOI)
        {


            if (!minPrice.HasValue)
                minPrice = trade.Price;

            if (!maxPrice.HasValue)
                maxPrice = trade.Price;

            minPrice = Math.Min(minPrice.Value, trade.Price);
            maxPrice = Math.Max(maxPrice.Value, trade.Price);

            /*  if (firstPrice == -1)
                  firstPrice = trade.Price;*/

            avg = PushTrade(trade);

            if (  (RestartDeltaMin.HasValue &&  CurrDelta <= RestartDeltaMin) || (RestartDeltaMin.HasValue && CurrDelta >= RestartDeltaMax) )
            {
                mid = 0;
                q = 0;
                CurrDelta = 0;
                CurrDeltaV = 0;
            }



            var dlt = trade.Direction == 1 ? trade.Quantity : -trade.Quantity;


            candlesMachine.PushTrade(trade, avg);

            //if (candlesMachine.d)



            if (candlesMachine.IsNew())
            {
                CurrDeltaV = 0;


                
                
                if (MinMaxCloseDay && candlesMachine.CandlesList.Count>2)
                {
                    decimal minc = candlesMachine.CandlesList[1].ClsPrice;
                    decimal maxc = minc;

                    for (int i = 1; i < candlesMachine.CandlesList.Count - 2;i++)
                    {
                        if (candlesMachine.CandlesList[i].ClsPrice < minc)
                        {
                            minc = candlesMachine.CandlesList[i].ClsPrice;
                            HiHi = candlesMachine.CandlesList[i-1].HiPrice; 
                        }

                        if (candlesMachine.CandlesList[i].ClsPrice > maxc)
                        {
                            maxc = candlesMachine.CandlesList[i].ClsPrice;
                            LoLo = candlesMachine.CandlesList[i-1].LoPrice;
                        }
                    }
                }



            }

            CurrDelta += dlt;
            CurrDeltaV += dlt;




            can = candlesMachine.GetLastCandles(2);



            lastTrade = trade;
            var price = lastTrade.Price;





            if (Mode == mode.Stopped)
                return;

            if (parent.CurrProfit() >= parent.LossFree)
                parent.MaxLoss = 0;

            if(parent.CurrProfit2()>1000)
            {
                int da = 0;
                da++;
            }

            bool cond1 = (parent.MaxLoss.HasValue && parent.CurrProfit() < parent.MaxLoss) 
                || (parent.MaxProfit.HasValue && parent.CurrProfit() > parent.MaxProfit);
            bool cond2 = (parent.MaxLoss2.HasValue && parent.CurrProfit2() < parent.MaxLoss2)
                || (parent.MaxProfit2.HasValue && parent.CurrProfit2() > parent.MaxProfit2);

            if (cond2 || cond1 )
            {
                if (Mode != mode.WaitingInput)
                {

                    // Mode = mode.WaitingInput;
                    // inputPrice = 0;
                    Mode = mode.Stopped;
                    totalProfit += parent.TradeOut(this);
                }
                Mode = mode.Stopped;

                if (parent.MaxLoss == 0)
                    parent.Mode = mode.StoppedNoLoss;
                else
                    parent.Mode = mode.Stopped;

            }



            if (can.Count < 2)
                return;


            if (trade.number == 1925035201407268777)
                trade.number = 1925035201407268777;


            switch (Mode)
            {
                case mode.WaitingInput:
                    //    case mode.Stopped:


                    var tr = parent.CurrProfit();

                   

                        if (TradeLastSeconds.HasValue)
                    {
                        var m_span = TimeSpan.FromMinutes(candlesMachine.Period);

                        if (!(
                            (trade.rounddate - trade.rounddate.Floor(m_span)) >
                            (TimeSpan.FromMinutes(candlesMachine.Period) - TimeSpan.FromSeconds(TradeLastSeconds.Value))))
                        {
                            break;
                        }


                    }

                    if (DoNotInputTwice())
                        break;

                   

                    if (CheckLong(trade, avg, avgOI))
                    {

                        Mode = mode.WaitingProfitLong;
                        minInput = can[0].LoPrice;
                        setContracts();





                        
                        







                        TradeIn(trade);

                    }
                    else
                    if (CheckShort(trade, avg, avgOI))
                    {

                        Mode = mode.WaitingProfitShort;
                        maxInput = can[0].HiPrice;
                        setContracts();
                        TradeIn(trade);
                    }



                    /*
                    var val = price - avg;

                    if (inverted)
                        val = avg - price;

                    if (contracts > 0)
                    {
                        if ( val > averageDeltaMin && val < averageDeltaMax)  ///!!!
                        {
                            inputTrade = trade;
                            Mode = mode.WaitingProfit;
                            parent.TradeIn(this);
                        }
                    }
                    else
                    {
                        if (val > averageDeltaMin && val < averageDeltaMax)  ///!!!
                        {
                            inputTrade = trade;
                            Mode = mode.WaitingProfit;
                            parent.TradeIn(this);
                        }
                    }*/

                    break;


                case mode.WaitingProfitLong:

                    var prof = currProfit();

                    if (CheckLong(trade, avg, avgOI) && CowardRabbit)
                    {
                        Mode = mode.Stopped;
                        totalProfit += parent.TradeOut(this);
                        Mode = mode.WaitingInput;
                        return;
                    }


                    if (stopProfitNew)
                    {
                        if(lastTrade.Price > stopLossLevel2)
                            stopProfitMode = true;
                    }
                    else
                    if (currProfit() > stopProfitEx)
                    {
                        stopProfitMode = true;
                    }


                    if (CheckShort(trade, avg, avgOI)&& !StopCoup)
                    {

                        Mode = mode.WaitingProfitShort;
                        maxInput = can[0].HiPrice;


                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;
                        setContracts();
                        SetCol();

                        TradeIn(trade);

                        setContracts();
                        return;
                    }

                    var zz = currProfit();

                    if (currProfit() > takeProfitEx)
                    {
                        Mode = mode.WaitingInput;

                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;

                        return;
                    }

                    if (stopLoss.HasValue && (stopProfitMode ? currProfit() < 0 : currProfit() < stopLoss))
                    {
                        Mode = mode.Stopped;
                        if (DoubleEnter)
                            DoubleEnterLong = false;
                        totalProfit += parent.TradeOut(this);
                        Mode = mode.WaitingInput;
                        stopProfitMode = false;
                        return;
                    }


                    if (stopProfitMode && (StopLossMinMaxDay || StopLossOpenCandle) && ( currProfit() < 0 ))
                    {
                        Mode = mode.Stopped;
                        if (DoubleEnter)
                            DoubleEnterLong = false;
                        totalProfit += parent.TradeOut(this);
                        Mode = mode.WaitingInput;
                        stopProfitMode = false;
                        return;
                    }


                    if (StopLossMinMaxDay && minPrice.HasValue && trade.Price == minPrice.Value)
                    {
                        Mode = mode.Stopped;

                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;
                        Mode = mode.WaitingInput;
                        return;
                    }

                    if (StopLossOpenCandle && minPrice.HasValue && trade.Price < candleOpen)
                    {
                        Mode = mode.Stopped;

                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;
                        Mode = mode.WaitingInput;
                        return;
                    }



                    if (StopLossOpen && (stopProfitMode ? currProfit() < 0 : firstPrice > trade.Price))
                    {
                        /*
                        Mode = mode.Stopped;
                        totalProfit += parent.TradeOut(this);
                        Mode = mode.WaitingInput;
                        stopProfitMode = false;*/
                        if (stopFlag)
                        {
                            stopLoss = -(firstPrice - inputPrice);
                            stopFlag = false;
                        }
                        return;
                    }



                    var c = can[0];

                    if (minInput - StopCandle > trade.Price)
                    {
                        Mode = mode.Stopped;
                        if (DoubleEnter)
                            DoubleEnterLong = false;
                        totalProfit += parent.TradeOut(this);
                        Mode = mode.WaitingInput;
                        stopProfitMode = false;
                    }


                    break;


                case mode.WaitingProfitShort:



                    if (CheckShort(trade, avg, avgOI) && CowardRabbit)
                    {
                        Mode = mode.Stopped;                        
                        totalProfit += parent.TradeOut(this);                        
                        Mode = mode.WaitingInput;
                        return;
                    }



                    if (stopProfitNew)
                    {
                        if (lastTrade.Price < stopLossLevel2)
                            stopProfitMode = true;
                    }
                    else
                   if (currProfit() > stopProfitEx)
                    {
                        stopProfitMode = true;
                    }



                    if (CheckLong(trade, avg, avgOI) && !StopCoup)
                    {

                        Mode = mode.WaitingProfitLong;
                        minInput = can[0].LoPrice;
                        SetCol();
                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;
                        setContracts();

                        SetCol();

                        TradeIn(trade);

                        setContracts();
                        return;
                    }


                    if (currProfit() > takeProfitEx)
                    {
                        Mode = mode.WaitingInput;

                        totalProfit += parent.TradeOut(this);

                        return;
                    }


                    if (StopLossMinMaxDay && maxPrice.HasValue && trade.Price==maxPrice.Value)
                    {
                        Mode = mode.Stopped;
                        
                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;
                        Mode = mode.WaitingInput;
                        return;
                    }

                    if (StopLossOpenCandle && minPrice.HasValue && trade.Price > candleOpen)
                    {
                        Mode = mode.Stopped;

                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;
                        Mode = mode.WaitingInput;
                        return;
                    }


                    if (stopLoss.HasValue && (stopProfitMode ? currProfit() < 0 : currProfit() < stopLoss))
                    {
                        Mode = mode.Stopped;
                        if (DoubleEnter)
                            DoubleEnterShort = false;
                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;
                        Mode = mode.WaitingInput;
                        return;

                    }


                    if (stopProfitMode && (StopLossMinMaxDay || StopLossOpenCandle) && (currProfit() < 0))
                    {
                        Mode = mode.Stopped;
                        if (DoubleEnter)
                            DoubleEnterLong = false;
                        totalProfit += parent.TradeOut(this);
                        Mode = mode.WaitingInput;
                        stopProfitMode = false;
                        return;
                    }


                    if (StopLossOpen && (stopProfitMode ? currProfit() < 0 : firstPrice < trade.Price))
                    {
                        /*
                        Mode = mode.Stopped;
                        totalProfit += parent.TradeOut(this);
                        Mode = mode.WaitingInput;
                        stopProfitMode = false;*/
                        if (stopFlag)
                        {
                            stopLoss = (firstPrice - inputPrice);
                            stopFlag = false;
                        }
                        return;
                    }



                    if (maxInput + StopCandle < trade.Price)
                    {
                        Mode = mode.Stopped;
                        if (DoubleEnter)
                            DoubleEnterShort = false;
                        totalProfit += parent.TradeOut(this);
                        stopProfitMode = false;
                        Mode = mode.WaitingInput;
                    }


                    break;

                  
            }
        }
    }




}
