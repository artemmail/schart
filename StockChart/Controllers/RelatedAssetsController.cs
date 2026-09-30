using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using DictionaryEntity = StockChart.Model.Dictionary;

namespace StockChart.Controllers;

[ApiController]
[Route("api/related-assets")]
public sealed class RelatedAssetsController : ControllerBase
{
    private const byte Stocks = 0;
    private const byte Futures = 1;
    private const byte Bonds = 2;
    private const byte Options = 7;
    private const byte SameIssuer = 1;
    private const byte Underlying = 2;

    private readonly ApplicationDbContext _db;
    private readonly IInstrumentRelationsService _relations;

    public RelatedAssetsController(ApplicationDbContext db, IInstrumentRelationsService relations)
    {
        _db = db;
        _relations = relations;
    }

    [HttpGet("{ticker}")]
    public async Task<IActionResult> Get(string ticker, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(ticker)) return BadRequest("ticker is required.");
        var code = ticker.Trim().ToUpperInvariant();
        var instrument = await _db.Dictionaries.AsNoTracking()
            .Where(d => d.Securityid == code)
            .OrderBy(d => d.Market == Stocks ? 0 : 1)
            .FirstOrDefaultAsync(cancellationToken);
        if (instrument == null) return NotFound("Instrument not found.");

        var stock = await ResolveBaseAssetAsync(instrument, new HashSet<int>(), cancellationToken);
        if (stock == null) return NotFound("Underlying asset not found.");

        var relations = await _relations.GetRelationsAsync(stock, cancellationToken);
        return relations == null ? NotFound("Relations not found.") :
            Ok(new { selectedMarket = instrument.Market, relations });
    }

    private async Task<DictionaryEntity?> ResolveBaseAssetAsync(DictionaryEntity instrument, HashSet<int> visited, CancellationToken ct)
    {
        if (!visited.Add(instrument.Id)) return null;
        if (instrument.Market != Futures && instrument.Market != Options && instrument.Market != Bonds)
            return instrument;

        var linked = await FindLinkedBaseAsync(instrument.Id,
            instrument.Market == Bonds ? SameIssuer : Underlying, ct);
        if (linked != null) return linked;

        if (instrument.Market == Bonds)
        {
            if (!instrument.EmitentId.HasValue) return null;
            return await _db.Dictionaries.AsNoTracking()
                .Where(d => d.Market == Stocks && d.EmitentId == instrument.EmitentId &&
                    (!d.ToDate.HasValue || d.ToDate.Value >= DateTime.UtcNow.Date))
                .OrderBy(d => d.Securityid)
                .FirstOrDefaultAsync(ct);
        }

        var parentIds = await _db.SecurityLinks.AsNoTracking()
            .Where(l => l.LinkType == Underlying && l.ToDictionaryId == instrument.Id)
            .Select(l => l.FromDictionaryId).ToListAsync(ct);
        var parents = await _db.Dictionaries.AsNoTracking()
            .Where(d => parentIds.Contains(d.Id)).ToListAsync(ct);
        foreach (var parent in parents)
        {
            var resolved = await ResolveBaseAssetAsync(parent, visited, ct);
            if (resolved != null) return resolved;
        }

        var assetCode = instrument.Market == Futures
            ? await _db.FutureSpecs.AsNoTracking()
                .Where(s => s.DictionaryId == instrument.Id)
                .Select(s => s.AssetCode).FirstOrDefaultAsync(ct)
            : await _db.OptionSpecs.AsNoTracking()
                .Where(s => s.DictionaryId == instrument.Id)
                .Select(s => s.AssetCode).FirstOrDefaultAsync(ct);
        if (string.IsNullOrWhiteSpace(assetCode)) return null;
        assetCode = assetCode.Trim().ToUpperInvariant();

        var mappedStock = await _db.UnderlyingMaps.AsNoTracking()
            .Where(m => m.AssetCode == assetCode)
            .Select(m => m.SpotSecId)
            .FirstOrDefaultAsync(ct);
        if (!string.IsNullOrWhiteSpace(mappedStock))
        {
            var stock = await FindBaseByCodeAsync(mappedStock.Trim().ToUpperInvariant(), ct);
            if (stock != null) return stock;
        }

        // Options may store the exact futures ticker rather than its asset code.
        var parentFuture = await _db.Dictionaries.AsNoTracking()
            .Where(d => d.Securityid == assetCode && d.Market == Futures && d.Id != instrument.Id)
            .FirstOrDefaultAsync(ct);
        if (parentFuture != null)
        {
            var resolved = await ResolveBaseAssetAsync(parentFuture, visited, ct);
            if (resolved != null) return resolved;
        }

        var directStock = await FindBaseByCodeAsync(assetCode, ct);
        if (directStock != null) return directStock;

        // Some exchange asset codes append F to the spot code. Only accept an existing stock.
        if (assetCode.EndsWith('F') && assetCode.Length > 1)
        {
            var spot = await FindBaseByCodeAsync(assetCode[..^1], ct);
            if (spot != null) return spot;
        }

        // An option may reference a futures asset. Follow that family's underlying link.
        var futureIds = await _db.FutureSpecs.AsNoTracking()
            .Where(s => s.AssetCode == assetCode)
            .Select(s => s.DictionaryId)
            .ToListAsync(ct);
        foreach (var futureId in futureIds)
        {
            var stock = await FindLinkedBaseAsync(futureId, Underlying, ct);
            if (stock != null) return stock;
        }

        // Index/commodity families can exist without a chartable spot instrument.
        // Keep the exchange asset code as the root, never a particular futures contract.
        var rootCode = string.IsNullOrWhiteSpace(mappedStock) ? assetCode : mappedStock.Trim().ToUpperInvariant();
        return new DictionaryEntity { Securityid = rootCode, Shortname = rootCode };
    }

    private Task<DictionaryEntity?> FindBaseByCodeAsync(string code, CancellationToken ct) =>
        _db.Dictionaries.AsNoTracking()
            .Where(d => d.Market != Futures && d.Market != Options && d.Market != Bonds && d.Securityid == code &&
                (!d.ToDate.HasValue || d.ToDate.Value >= DateTime.UtcNow.Date))
            .FirstOrDefaultAsync(ct);

    private async Task<DictionaryEntity?> FindLinkedBaseAsync(int id, byte type, CancellationToken ct)
    {
        var linkedIds = await _db.SecurityLinks.AsNoTracking()
            .Where(l => l.LinkType == type && (l.FromDictionaryId == id || l.ToDictionaryId == id))
            .Select(l => l.FromDictionaryId == id ? l.ToDictionaryId : l.FromDictionaryId)
            .ToListAsync(ct);
        return await _db.Dictionaries.AsNoTracking()
            .Where(d => linkedIds.Contains(d.Id) &&
                (type == SameIssuer ? d.Market == Stocks : d.Market != Futures && d.Market != Options && d.Market != Bonds) &&
                (!d.ToDate.HasValue || d.ToDate.Value >= DateTime.UtcNow.Date))
            .OrderBy(d => d.Securityid)
            .FirstOrDefaultAsync(ct);
    }
}
