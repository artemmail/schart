using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;
        private readonly ILogger<LastTradeCache> _logger;

        public LastTradeCache(
            IDbContextFactory<ApplicationDbContext> contextFactory,
            ILogger<LastTradeCache> logger)
        {
            _contextFactory = contextFactory;
            _logger = logger;
        }

        public async Task<long> GetLastTradeNumberAsync(int tickerId, CancellationToken cancellationToken = default)
        {
            if (_cache.TryGetValue(tickerId, out var cachedNumber))
                return cachedNumber;

            await using var context = await _contextFactory.CreateDbContextAsync(cancellationToken);

            // MaxTrades can lag or be empty in some environments; fallback to Trades max.
            var lastNumber = await context.MaxTrades
                .AsNoTracking()
                .Where(x => x.Id == tickerId)
                .Select(x => (long?)x.MaxNumber)
                .FirstOrDefaultAsync(cancellationToken) ?? 0;

            if (lastNumber <= 0)
            {
                var tradesMaxNumber = await context.Trades
                    .AsNoTracking()
                    .Where(x => x.Id == tickerId)
                    .Select(x => (long?)x.Number)
                    .MaxAsync(cancellationToken) ?? 0;

                if (tradesMaxNumber > lastNumber)
                {
                    lastNumber = tradesMaxNumber;
                    _logger.LogInformation(
                        "LastTradeCache fallback: tickerId={TickerId}, maxFromTrades={MaxFromTrades}",
                        tickerId,
                        tradesMaxNumber);
                }
            }

            _cache[tickerId] = lastNumber;
            return lastNumber;
        }

        public void UpdateLastTradeNumber(int tickerId, long number)
        {
            _cache.AddOrUpdate(tickerId, number, (_, current) => number > current ? number : current);
        }
    }
}
