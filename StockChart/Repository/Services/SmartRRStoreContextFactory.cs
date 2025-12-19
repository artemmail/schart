using Microsoft.EntityFrameworkCore;
using StockChart.Model;

public class SmartRRStoreContextFactory : IDbContextFactory<StockProcContext>
{
    private readonly IServiceProvider _serviceProvider;

    public SmartRRStoreContextFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public virtual StockProcContext CreateDbContext()
    {
        // need a new options object for each 'factory generated' context
        // because of thread safety isuess with Interceptors
        var options = (DbContextOptions<ApplicationDbContext2>)_serviceProvider.GetService(typeof(DbContextOptions<ApplicationDbContext2>));
        return new StockProcContext(options);
    }
}