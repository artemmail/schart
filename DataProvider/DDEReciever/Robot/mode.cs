using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PlayerOnline.DDEReciever.Robot
{
    public enum mode
    {
        WaitingInput,
        WaitingProfit,

        WaitingProfitLong,
        WaitingProfitShort,

        WaitingFixProfit,
        WaitingStopExit,
        Stopped,
        StoppedNoLoss
    }
}
