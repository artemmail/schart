using StockChart.EventBus.Models;

namespace StockChart.Repository
{
    public interface ISubscribeRepository
    {
        public Task Subscribe(SubsCandle[] array);

        public Task Subscribe(SubsCluster[] array);
    }
}