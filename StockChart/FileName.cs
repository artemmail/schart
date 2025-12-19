
/*
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using NLog.Extensions.Logging;
using NLog.Web;
using StockChart.EventBus.RabbitMQ.DependencyInjection;
using StockChart.Notification.WebApi.RabbitMQ.Subscriptions;
using SignalRMvc.Hubs;
using StockChart.Hubs;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Services;
using System.Text.Json;

var MyAllowSpecificOrigins = "AllowSpecificOrigin";// "_myAllowSpecificOrigins";

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");


builder.Services.AddHttpClient();

builder.Services.AddDatabaseDeveloperPageExceptionFilter();
builder.Services.AddDbContext<StockProcContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddDbContext<ApplicationDbContext2>(options => options.UseSqlServer(connectionString));
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));

builder.Services.AddDefaultIdentity<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddEntityFrameworkStores<StockProcContext>();
builder.Services.AddScoped<DbContext, StockProcContext>();
builder.Services.AddSingleton<ITickersRepository, TickersRepository>();
builder.Services.AddScoped<ITopicsRepository, TopicsRepository>();
builder.Services.AddScoped<ICommentsRepository, CommentsRepository>();
builder.Services.AddScoped<IPortfoiloRepository, PortfoiloRepository>();
builder.Services.AddScoped<ICandlesRepository, CandlesRepository>();
builder.Services.AddScoped<ICandlesRepositorySet, CandlesRepositorySet>();
builder.Services.AddScoped<IClusterRepository, ClusterRepository>();
builder.Services.AddScoped<IPaymentsRepository, PaymentsRepository>();
builder.Services.AddScoped<IUsersRepository, UsersRepository>();
builder.Services.AddScoped<ISettingsRepository, SettingsRepository>();
builder.Services.AddScoped<IReportsRepository, ReportsRepository>();
builder.Services.AddScoped<IBillingRepository, BillingRepository>();
builder.Services.AddScoped<ISubscribeRepository, SubscribeRepository>();
builder.Services.AddScoped<IImageStoreRepository, ImageStoreRepository>();
builder.Services.AddSingleton<CandlesHub>();

builder.Services.Configure<CacheConfiguration>(builder.Configuration.GetSection("CacheConfiguration"));
builder.Services.Configure<RecieverOptions>(builder.Configuration.GetSection("RecieverOptions"));

builder.Services.AddRabbitMq(builder.Configuration.GetSection("EventBus"));
builder.Services.AddSubscriber<ClusterSubscriber>();

builder.Services.AddMemoryCache();
builder.Services.AddScoped<IEmailSender, EmailSender>();
builder.Services.AddScoped<IYooMoneyRepository, YooMoneyRepository>();
builder.Services.AddTransient<MemoryCacheService>();
builder.Services.AddTransient<RedisCacheService>();
builder.Services.AddTransient<Func<CacheTech, ICacheService>>(serviceProvider => key =>
{
    return key switch
    {
        CacheTech.Memory => serviceProvider.GetService<MemoryCacheService>(),
        CacheTech.Redis => serviceProvider.GetService<RedisCacheService>(),
        _ => serviceProvider.GetService<MemoryCacheService>(),
    };
});

builder.Services.AddScoped<IStockMarketServiceRepository, StockMarketServiceRepository>();
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = null;
});
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.AddSignalR();
builder.Services.AddHostedService<TimedHostedService>();
builder.Services.AddSingleton<IPasswordHasher<ApplicationUser>, PasswordHasherWithOldMembershipSupport>();
builder.Services.AddScoped<IAuthorizationHandler, SampleAuthorizationHandler>();
builder.Services.AddDetection();

builder.Logging.ClearProviders();
builder.Logging.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Trace);
builder.Logging.AddNLogWeb();
builder.Logging.AddNLog();

builder.Services.AddControllersWithViews();

// Добавляем поддержку статических файлов для SPA
builder.Services.AddSpaStaticFiles(configuration =>
{
    var spaOptions = new SpaOptions();
    builder.Configuration.GetSection("SpaOptions").Bind(spaOptions);
    configuration.RootPath = spaOptions.SpaRootPath;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy(MyAllowSpecificOrigins,
        builder =>
        {
            builder.WithOrigins("http://localhost:4200")
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials();
        });
});

builder.Logging.AddDebug();
builder.Logging.AddConsole();


var app = builder.Build();

app.UseCors(MyAllowSpecificOrigins);

app.MapHub<CandlesHub>("/CandlesHub");

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}


app.UseHttpsRedirection();
//app.UseStaticFiles();


app.UseStaticFiles(new StaticFileOptions
{
    ServeUnknownFileTypes = true, // Это позволяет обрабатывать файлы с неизвестными расширениями
    DefaultContentType = "application/octet-stream"
});


app.UseSpaStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();



app.UseEndpoints(endpoints =>
{
    endpoints.MapControllerRoute(
        name: "api",
        pattern: "api/{controller=Home}/{action=Index}/{id?}");

    endpoints.MapControllerRoute(
        name: "shots",
        pattern: "shots/{controller=Home}/{action=Index}/{id?}");

    endpoints.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Index}/{id?}");


});

app.UseSpa(spa =>
{
    spa.Options.SourcePath = "ClientApp";

   
   
        spa.Options.DefaultPage = "/index.html";
   
});

app.Run();
*/