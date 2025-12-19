
using StockChart.EventBus.Models;
using System.Collections.Generic;

namespace StockChart.Messages
{
    public class ClusterMessage
    {
        public Dictionary<string, List<ClusterColumnWCF>> body;
    }
}
