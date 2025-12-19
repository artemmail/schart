using StockChart.EventBus.Models;
using static StockProcContext;
namespace StockChart.Repository.Services
{
    public interface IClusterRepository
    {
        //public List<ClusterColumnWCF> ClusterProfileQuery(int id, decimal period, DateTimePair Dates, decimal step, bool Postmarket);

        public Task<List<ClusterColumnWCF>> ClusterProfileQuery(int id, byte market, decimal period, DateTimePair Dates, decimal step, bool Postmarket);
        public Task<List<VolumeSearchResult>> VolumeSearch(string ticker, int period, DateTimePair dates, decimal priceStep);
        public Task<List<ClusterColumnWCF>> GetLastCluster(int tickerid, decimal period, decimal step, int top);
    }
}