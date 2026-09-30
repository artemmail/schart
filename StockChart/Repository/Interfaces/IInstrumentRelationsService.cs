using StockChart.Model;

namespace StockChart.Repository.Interfaces
{
    public interface IInstrumentRelationsService
    {
        Task<InstrumentRelationsDto> GetRelationsAsync(StockChart.Model.Dictionary root, CancellationToken cancellationToken = default);
        Task<InstrumentRelationsDto?> GetRelationsAsync(string stockSecId, CancellationToken cancellationToken = default);
    }
}
