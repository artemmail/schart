using Microsoft.EntityFrameworkCore;
using StockChart.Model;

namespace StockChart.Data;

public static class DatabaseContextFactory
{
    private static DbContextOptions<ApplicationDbContext2> BuildOptions(string connectionString)
    {
        return new DbContextOptionsBuilder<ApplicationDbContext2>()
            .UseSqlServer(connectionString)
            .Options;
    }

    public static StockProcContext CreateStockProcContext(string connectionString)
    {
        var options = BuildOptions(connectionString);
        return new StockProcContext(options);
    }

    public static ApplicationDbContext CreateApplicationDbContext(string connectionString)
    {
        var options = BuildOptions(connectionString);
        return new ApplicationDbContext(options);
    }

    public static ApplicationDbContext2 CreateApplicationDbContext2(string connectionString)
    {
        var options = BuildOptions(connectionString);
        return new ApplicationDbContext2(options);
    }
}
