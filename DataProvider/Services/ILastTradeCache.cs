using System.Threading;
using System.Threading.Tasks;

namespace DataProvider
{
    public interface ILastTradeCache
    {
        Task<long> GetLastTradeNumberAsync(int tickerId, CancellationToken cancellationToken = default);

        void UpdateLastTradeNumber(int tickerId, long number);
    }
}
