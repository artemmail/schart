using System.Threading;
using System.Threading.Tasks;

namespace DataProvider
{
    public interface ILastTradeCache
    {
        Task<long> GetLastTradeNumberAsync(
            int tickerId,
            bool includeTradesFallback = true,
            CancellationToken cancellationToken = default);

        void UpdateLastTradeNumber(int tickerId, long number);
    }
}
