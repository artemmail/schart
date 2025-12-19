using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace PlayerOnline.DDEReciever.Robot
{
    
    public class RobotContainer
    {
        public mode Mode = mode.WaitingInput;
        List<IRobot> robots;
        public List<log> robot_trades = new List<log>();
        public List<log2> robot_trades2 = new List<log2>();
        
        
        
        decimal mid = 0;






          decimal delta = 0;
        

        decimal midC = 0;

        decimal midd = 0;
        decimal qq = 0;

        
        decimal OIdelta = 0;
        decimal sumPDP = 0;
        private decimal sumDelta;
        decimal prevOI = 0;






        int q = 0;
        string ticker;
        int MaxContacts;
        int comis;
        public int? MaxLoss;
        public int? MaxProfit;

        public int? MaxLoss2;
        public int? MaxProfit2;

        public int LossFree;
        public static TimeSpan FinishTrade;
        public static TimeSpan StartTrade;
        private int totalQ;

        TimeSpan stringToTimeSpan(string s)
        {
            var hhmm = s.Split(':').Select(x => int.Parse(x)).ToArray();
            return TimeSpan.FromMinutes(hhmm[0] * 60 + hhmm[1]);
        }

        public RobotContainer(string config)
        {
            comis = PlayerOnline.Pages.HomeController.settings.Comis;

            MaxLoss = PlayerOnline.Pages.HomeController.settings.MaxLoss;
            MaxProfit = PlayerOnline.Pages.HomeController.settings.MaxProfit;

            MaxLoss2 = PlayerOnline.Pages.HomeController.settings.MaxLoss2;
            MaxProfit2 = PlayerOnline.Pages.HomeController.settings.MaxProfit2;


            LossFree = PlayerOnline.Pages.HomeController.settings.LossFree;
            StartTrade = stringToTimeSpan(PlayerOnline.Pages.HomeController.settings.StartTrade);
            FinishTrade = stringToTimeSpan(PlayerOnline.Pages.HomeController.settings.FinishTrade);
            dynamic data = JsonConvert.DeserializeObject(config);
            ticker = data.ticker;
            MaxContacts = data.MaxContracts;

            robots = new List<IRobot>();

            foreach (var v in data.robots)
            {

                Type typeOfDynamic = v.GetType();

                string type = "Avg";

                try
                {
                    type = v.type;
                }
                catch
                {

                }

                if (type == "Avg")
                {
                    var r = new Robot(this);

                    r.averageDeltaMin = v.averageDeltaMin;
                    r.inverted = v.inverted;
                    r.averageDeltaMax = v.averageDeltaMax;
                    r.contracts = v.contracts;
                    r.stopProfit = v.stopProfit;
                    r.takeProfit = v.takeProfit;

                    try
                    {

                        r.Col = v.Col;
                        if (r.Col == null)
                            r.Col = "grey";
                    }
                    catch (Exception e)
                    {

                    }

                    robots.Add(r);
                }
                else
                {
                    var r = new RobotCandles(this, (uint) v.period  );

                    try
                    {

                       r.ColTemp =  r.Col = v.Col;
                        if (r.Col == null)
                            r.ColTemp = r.Col = "grey";
                    }
                    catch (Exception e)
                    {

                    }

                    r.contracts = v.contracts;
                    r.stopProfit = v.stopProfit;
                    r.takeProfit = v.takeProfit;


                    foreach (var x in v)
                    {
                        var prop = r.GetType().GetField(x.Name);
                        if (prop != null)                        
                            prop.SetValue(r, Convert.ChangeType(x.First, prop.FieldType));

                        /*

                        var prop1 = r.GetType().GetProperty(x.Name);
                        if (prop1 != null)
                            prop1.SetValue(r, Convert.ChangeType(x.First, prop1.FieldType));*/

                    }

                    r.stopLossStack = r.stopLoss;

                    robots.Add(r);


                }
            }

        }

        public decimal CurrProfit()
        {



            return GetLog2().Select(x => x.Total).Sum();
        }


        public decimal CurrProfit2()
        {
           return    ((IEnumerable<log2>)TradesCacher.Robots1.GetLog2())
                .Sum(x => x.Total / x.PotentialStopLoss * 1000);
        }


        public decimal CurrOpen()
        {
          //  var t = robots.Where(y => y.Mode != mode.WaitingInput).Where(x=>x.inputPrice>0).Select(x => x.contracts).ToArray();
         //   var t2 = robots.Where(y => y.Mode != mode.WaitingInput).Select(x => x.inputPrice).ToArray();

            return robots.Where(y => y.Mode != mode.WaitingInput).Where(x => x.inputPrice > 0).Select(x => x.contracts).Sum();
        }

        public decimal AvgPrice()
        {
            var s = CurrOpen();
            if (s == 0)
                return 0;

            return robots.Where(y => y.Mode != mode.WaitingInput).Where(x => x.inputPrice > 0).Select(x => x.contracts * x.inputPrice).Sum() / s;
        }


        public void log(log t)
        {
            robot_trades.Add(t);
        }


        public void TradeIn(IRobot r)
        {
            robot_trades.Add(new log() { Prc = r.lastTrade.Price, Qnt = r.contracts, 
                Dir = r.contracts > 0, 
                time = r.lastTrade.rounddate, 
                Col = r.Col, 
                IsStop = false,  
                PotentialStopLoss =  r.getPotentialStopLoss()                               
                });
        }

        public decimal TradeOut(IRobot r)
        {
            robot_trades.Add(new log() { Prc = r.lastTrade.Price, Qnt = r.contracts, Dir =  r.contracts < 0, time = r.lastTrade.rounddate, Col = r.Col, IsStop = r.Mode == mode.Stopped });
            var l2 = new log2(r, comis);
            robot_trades2.Add(l2);
             return   l2.Total;
        }

        public IEnumerable<log2> GetLog2()
        {
            foreach (var r in robot_trades2)
                yield return r;

            //const HashSet<mode> set = new HashSet<mode> { mode.WaitingInput,  mode. }

            foreach (var r in robots)
            {
                if (r.Mode != mode.WaitingInput && r.Mode != mode.Stopped)
                {
                    yield return new log2(r, comis);
                }
            };
        }
        public void PushTrade(Trade trade)
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
            var MID1 = (sumDelta + totalQ)!=0 ? (mid + midC) / (sumDelta + totalQ):0;
            var AvgOI = sumDelta!= 0 ? (midC) / (sumDelta): 0;

            prevOI = trade.OI;

            if (trade.rounddate.TimeOfDay >= StartTrade && trade.rounddate.TimeOfDay <= FinishTrade)
            {
                foreach (var r in robots)
                    r.pushTrade(trade, mid / q, AvgOI);
            }
        }
    }

}
