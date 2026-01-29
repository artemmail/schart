using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using DictionaryEntity = StockChart.Model.Dictionary;

namespace StockChart.Repository.Services
{
    public sealed class InstrumentRelationsService : IInstrumentRelationsService
    {
        private const byte MarketStocks = 0;
        private const byte MarketFutures = 1;
        private const byte MarketOptions = 7;

        private const byte LinkSameIssuer = 1;
        private const byte LinkUnderlying = 2;

        private readonly ApplicationDbContext _db;

        public InstrumentRelationsService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<InstrumentRelationsDto?> GetRelationsAsync(string stockSecId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(stockSecId))
            {
                return null;
            }

            var normalized = stockSecId.Trim().ToUpperInvariant();
            var stock = await _db.Dictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Market == MarketStocks && d.Securityid == normalized, cancellationToken);

            if (stock == null)
            {
                return null;
            }

            var links = await _db.SecurityLinks
                .AsNoTracking()
                .Where(l => l.FromDictionaryId == stock.Id)
                .ToListAsync(cancellationToken);

            if (links.Count == 0)
            {
                return new InstrumentRelationsDto
                {
                    Stock = MapItem(stock)
                };
            }

            var toIds = links.Select(l => l.ToDictionaryId).Distinct().ToList();
            var related = await _db.Dictionaries
                .AsNoTracking()
                .Where(d => toIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, cancellationToken);

            var bonds = new List<InstrumentRelationItemDto>();
            var futures = new List<InstrumentRelationItemDto>();
            var options = new List<InstrumentRelationItemDto>();

            var seenBonds = new HashSet<int>();
            var seenFutures = new HashSet<int>();
            var seenOptions = new HashSet<int>();

            foreach (var link in links)
            {
                if (!related.TryGetValue(link.ToDictionaryId, out var dic))
                {
                    continue;
                }

                if (link.LinkType == LinkSameIssuer)
                {
                    if (seenBonds.Add(dic.Id))
                    {
                        bonds.Add(MapItem(dic));
                    }
                    continue;
                }

                if (link.LinkType == LinkUnderlying)
                {
                    if (dic.Market == MarketFutures)
                    {
                        if (seenFutures.Add(dic.Id))
                        {
                            futures.Add(MapItem(dic));
                        }
                    }
                    else if (dic.Market == MarketOptions)
                    {
                        if (seenOptions.Add(dic.Id))
                        {
                            options.Add(MapItem(dic));
                        }
                    }
                }
            }

            bonds.Sort((a, b) => string.CompareOrdinal(a.SecurityId, b.SecurityId));
            futures.Sort((a, b) => string.CompareOrdinal(a.SecurityId, b.SecurityId));
            options.Sort((a, b) => string.CompareOrdinal(a.SecurityId, b.SecurityId));

            return new InstrumentRelationsDto
            {
                Stock = MapItem(stock),
                Bonds = bonds,
                Futures = futures,
                Options = options
            };
        }

        private static InstrumentRelationItemDto MapItem(DictionaryEntity dic)
        {
            return new InstrumentRelationItemDto
            {
                DictionaryId = dic.Id,
                SecurityId = dic.Securityid,
                Shortname = dic.Shortname,
                Market = dic.Market,
                Isin = dic.Isin
            };
        }
    }
}
