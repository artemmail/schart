using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace DataProvider
{
    public class LastTradeCache : ILastTradeCache
    {
        private readonly ConcurrentDictionary<int, long> _cache = new();
        private readonly IDbContextFactory<StockProcContext> _contextFactory;

        public LastTradeCache(IDbContextFactory<StockProcContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<long> GetLastTradeNumberAsync(int tickerId, CancellationToken cancellationToken = default)
        {
            if (_cache.TryGetValue(tickerId, out var cachedNumber))
                return cachedNumber;

            await using var context = await _contextFactory.CreateDbContextAsync(cancellationToken);

            var lastNumber = await context.MaxTrades
                .AsNoTracking()
                .Where(x => x.Id == tickerId)
                .Select(x => x.MaxNumber)
                .FirstOrDefaultAsync(cancellationToken);

            _cache[tickerId] = lastNumber;
            return lastNumber;
        }

        public void UpdateLastTradeNumber(int tickerId, long number)
        {
            _cache.AddOrUpdate(tickerId, number, (_, current) => number > current ? number : current);
        }
    }
}
