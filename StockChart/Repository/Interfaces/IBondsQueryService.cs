using StockChart.Model;

namespace StockChart.Repository.Interfaces;

public interface IBondsQueryService
{
    Task<BondListResponseDto> GetListAsync(BondsListRequestDto request, CancellationToken cancellationToken = default);
    Task<BondDetailsResponseDto?> GetDetailsAsync(string secIdOrIsin, CancellationToken cancellationToken = default);
}
