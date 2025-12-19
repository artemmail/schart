using StockChart.EventBus.Models;

namespace StockChart.Messages
{
    public class SubscribeClusterMessage
    {
        public SubsCluster[] body;
    }
}
