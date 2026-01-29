namespace StockChart.Repository.Moex
{
    public readonly record struct OpenPositionsImportData(
        DateTime TradeDate,
        long PhysicalLong,
        long PhysicalShort,
        long JuridicalLong,
        long JuridicalShort,
        long PhysicalLongDelta,
        long PhysicalShortDelta,
        long JuridicalLongDelta,
        long JuridicalShortDelta,
        int PhysicalLongCount,
        int PhysicalShortCount,
        int JuridicalLongCount,
        int JuridicalShortCount
    );
}
