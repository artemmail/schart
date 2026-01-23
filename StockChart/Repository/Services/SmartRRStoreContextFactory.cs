using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockChart.Model;

public class SmartRRStoreContextFactory : IDbContextFactory<ApplicationDbContext>
{
    private readonly IServiceProvider _serviceProvider;

    public SmartRRStoreContextFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public virtual ApplicationDbContext CreateDbContext()
    {
        // need a new options object for each 'factory generated' context
        // because of thread safety isuess with Interceptors
        var options = _serviceProvider.GetRequiredService<DbContextOptions<ApplicationDbContext>>();
        return new ApplicationDbContext(options);
    }
}
