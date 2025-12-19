using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace PlayerOnline.DDEReciever.Robot
{
   

    public class Robot : IRobot
    {
        
        public bool inverted;
        public decimal averageDeltaMin;
        public decimal averageDeltaMax;
        public decimal takeProfit;
        public decimal stopProfit;        
        public string Col { get; set; }        
        decimal maxTakeProfit;
        public Trade lastTrade { get; set; }
        public Trade inputTrade { get; set; }
        public mode Mode { get; set; }
        public int contracts { get; set; }

        public RobotContainer parent;

        public Robot(RobotContainer parent)
        {
            this.parent = parent;
            Mode = mode.WaitingInput;
            Col = "blue";
        }


        public decimal getPotentialStopLoss()
        {
            return 0;
        }
        public decimal currProfit()
        {
            return (lastTrade.Price - inputPrice) * Math.Sign(contracts);
        }

        public decimal inputPrice { get { return inputTrade.Price; } }

        public void pushTrade(Trade trade, decimal avg, decimal avgOI)
        {
            lastTrade = trade;
            var price = lastTrade.Price;


            if (Mode == mode.Stopped)
                return;

            if (parent.CurrProfit() >= parent.LossFree)
                parent.MaxLoss = 0;

            if (parent.CurrProfit() < parent.MaxLoss || (parent.MaxProfit.HasValue && parent.CurrProfit() > parent.MaxProfit))
            {
                if (Mode != mode.WaitingInput)
                {

                    // Mode = mode.WaitingInput;
                    // inputPrice = 0;
                    Mode = mode.Stopped;
                    parent.TradeOut(this);
                }
                Mode = mode.Stopped;

                if (parent.MaxLoss == 0)
                    parent.Mode = mode.StoppedNoLoss;
                else
                    parent.Mode = mode.Stopped;

            }
            switch (Mode)
            {
                case mode.WaitingInput:

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
                    }

                    break;
                case mode.WaitingProfit:
                    if (currProfit() > takeProfit)
                    {
                        Mode = mode.WaitingFixProfit;
                        maxTakeProfit = takeProfit;
                    }

                    //   if (inputPrice - price > stopLoss)
                    //  {
                    //      Mode = mode.WaitingStopExit;
                    //    }
                    break;
                case mode.WaitingFixProfit:
                    {
                        maxTakeProfit = Math.Max(maxTakeProfit, currProfit());

                        if (maxTakeProfit - currProfit() > stopProfit)
                        {

                            Mode = mode.WaitingInput;
                            //   inputPrice = 0;
                            parent.TradeOut(this);
                        }
                    }
                    break;
                case mode.WaitingStopExit:
                    if ((contracts > 0 && price >= inputPrice) || (contracts < 0 && price <= inputPrice))
                    {

                        Mode = mode.WaitingInput;
                        // inputPrice = 0;
                        parent.TradeOut(this);
                    }
                    break;
            }
        }
    }



   
}
