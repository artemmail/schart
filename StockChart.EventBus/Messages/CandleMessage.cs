
using StockChart.EventBus.Models;
using System.Collections.Generic;

namespace StockChart.Messages
{
    public class CandleMessage
    {
        public Dictionary<string, List<BaseCandle>> body;
    }
}
