using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using StockChart.Model;

namespace StockChart.Data;

public class ApplicationDbContext2Factory : IDesignTimeDbContextFactory<ApplicationDbContext2>
{
    public ApplicationDbContext2 CreateDbContext(string[] args)
    {
        var basePath = ResolveBasePath();
        var configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("DefaultConnection is missing in appsettings.json.");
        }

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext2>();
        optionsBuilder.UseSqlServer(connectionString);

        return new ApplicationDbContext2(optionsBuilder.Options);
    }

    private static string ResolveBasePath()
    {
        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (directory != null)
        {
            var candidate = Path.Combine(directory.FullName, "appsettings.json");
            if (File.Exists(candidate))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        return Directory.GetCurrentDirectory();
    }
}
