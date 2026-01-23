using Microsoft.EntityFrameworkCore;
using StockChart.Model;

namespace StockChart.Data;

public static class DatabaseContextFactory
{
    private static DbContextOptions<TContext> BuildOptions<TContext>(string connectionString) where TContext : DbContext
    {
        return new DbContextOptionsBuilder<TContext>()
            .UseSqlServer(connectionString)
            .Options;
    }

    public static ApplicationDbContext CreateApplicationDbContext(string connectionString)
    {
        var options = BuildOptions<ApplicationDbContext>(connectionString);
        return new ApplicationDbContext(options);
    }
}
