using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using DataProvider.Services;
using StockChart.EventBus.RabbitMQ.DependencyInjection;
using StockChart.Notification.WebApi.RabbitMQ.Subscriptions;
using System;
using StockChart.Data;

namespace DataProvider
{
    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            SQLHelper.ConnectionString = builder.Configuration.GetConnectionString("Stock") ?? throw new InvalidOperationException("Connection string 'Stock' not found.");
            // Add services to the container.
            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddDbContextFactory<StockProcContext>(options =>
                options.UseSqlServer(SQLHelper.ConnectionString));



            builder.Services.Configure<BroadCastOptions>(builder.Configuration.GetSection("BroadCastOptions"));

            builder.Services.AddSingleton<ITradesCacherRepository, TradesCacherRepository>();

            builder.Services.AddSingleton<IBroadCast, BroadCast>();
            builder.Services.AddSingleton<ILastTradeCache, LastTradeCache>();


            builder.Services.AddHostedService<HostetBinanceService>();
            builder.Services.AddHostedService<HostetDBWriterService>();
            builder.Services.AddHostedService<MissingIntervalsFetcherService>();
            builder.Services.AddHostedService<DDEServer>();

            builder.Services.AddRabbitMq(builder.Configuration.GetSection("EventBus"));
            builder.Services.AddSubscriber<Subscriber>();

            builder.Services.AddSingleton<IMarketInfoService, MarketInfoService>();

            /*
             builder.Services.AddGrpc();         
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.Listen(IPAddress.Any, 5001, listenOptions =>
                {
                    listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
                listenOptions.UseHttps();// "C:/pfx/cert.pfx",  "121212");
                });
            });
            */

            var app = builder.Build();

            MarketInfoServiceHolder.Configure(app.Services.GetRequiredService<IMarketInfoService>());

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }
            app.UseHttpsRedirection();
            app.UseAuthorization();
            app.MapControllers();

            /*
                        app.MapGrpcService<GreeterService>();
                        app.MapGet("/tst", () => "Communication with gRPC endpoints must be made through a gRPC client. To learn how to create a client, visit: https://go.microsoft.com/fwlink/?linkid=2086909");
            */
            app.Run();
            /*CreateHostBuilder(args).Build().Run();*/
        }
        /*  public static IHostBuilder CreateHostBuilder(string[] args) =>
              Host.CreateDefaultBuilder(args)
                  .ConfigureWebHostDefaults(webBuilder =>
                  {
                      webBuilder.UseStartup<Startup>();
                  });*/
    }
}
