using System.Threading;
using System.Threading.Tasks;

namespace DataProvider
{
    public interface ILastTradeCache
    {
        Task<long> GetLastTradeNumberAsync(int tickerId, CancellationToken cancellationToken = default);

        Task UpdateLastTradeNumberAsync(int tickerId, long number, CancellationToken cancellationToken = default);
    }
}
