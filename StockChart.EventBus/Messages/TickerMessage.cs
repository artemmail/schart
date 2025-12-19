
using StockChart.EventBus.Models;
using System.Collections.Generic;

namespace StockChart.Messages
{
    public class TickerMessage
    {
        public Dictionary<string, List<tick>> body;
    }
}
