
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using MyApp.HostedServices;
using NLog.Extensions.Logging;
using NLog.Web;
using StockChart.EventBus.RabbitMQ.DependencyInjection;
using StockChart.Notification.WebApi.RabbitMQ.Subscriptions;
using SignalRMvc.Hubs;
using StockChart.Api.HostedServices;
using StockChart.Controllers;
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


/*
builder.Services.AddDefaultIdentity<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddEntityFrameworkStores<StockProcContext>();
*/
builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddEntityFrameworkStores<StockProcContext>()
    .AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.Name = ".AspNetCore.Identity.Application";
    options.LoginPath = "/api/auth/login"; // неважно, если только API
    options.AccessDeniedPath = "/access-denied"; // по желанию
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(30);

    // Самое важное:
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always; // если HTTPS
});


builder.Services.AddRazorPages();


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
builder.Services.AddScoped<IPortfoiloRepository, PortfoiloRepository>();
builder.Services.AddScoped<ISubscribeRepository, SubscribeRepository>();
builder.Services.AddScoped<IImageStoreRepository, ImageStoreRepository>();
builder.Services.AddScoped<IAdminService, AdminService>();

builder.Services.AddScoped<SinglePageService>();


builder.Services.AddScoped<BatchImportOpenPositionsService>();




builder.Services.AddSingleton<CandlesHub>();

builder.Services.AddSingleton<BatchImportOpenPositionsServiceNew>();




builder.Services.Configure<CacheConfiguration>(builder.Configuration.GetSection("CacheConfiguration"));
builder.Services.Configure<RecieverOptions>(builder.Configuration.GetSection("RecieverOptions"));
builder.Services.Configure<YooMoneyOptions>(builder.Configuration.GetSection("YooMoney"));


builder.Services.AddRabbitMq(builder.Configuration.GetSection("EventBus"));


builder.Services.AddSubscriber<ClusterSubscriber>();


//For In-Memory Caching
builder.Services.AddMemoryCache();

///builder.Services.Configure<AuthMessageSenderOptions>(builder.Configuration);

builder.Services.AddScoped<IEmailSender, EmailSender>();
builder.Services.AddScoped<IYooMoneyRepository, YooMoneyRepository>();


builder.Services.AddTransient<MemoryCacheService>();
builder.Services.AddTransient<RedisCacheService>();
builder.Services.AddTransient<Func<CacheTech, ICacheService>>(serviceProvider => key =>
{
    switch (key)
    {
        case CacheTech.Memory:
            return serviceProvider.GetService<MemoryCacheService>();
        case CacheTech.Redis:
            return serviceProvider.GetService<RedisCacheService>();
        default:
            return serviceProvider.GetService<MemoryCacheService>();
    }
});
///https://github.com/graphql-dotnet/graphql-dotnet/issues/2257
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
builder.Services.AddHostedService<YooMoneyHostedService>();
builder.Services.AddHostedService<NightlyFunctionHostedService>();



//builder.Services.AddScoped<IScopedProcessingService, ScopedProcessingService>();
builder.Services.AddSingleton<IPasswordHasher<ApplicationUser>, PasswordHasherWithOldMembershipSupport>();
builder.Services.AddScoped<IAuthorizationHandler, SampleAuthorizationHandler>();

builder.Services.AddKendo();
builder.Services.AddDetection();


builder.Logging.ClearProviders();
builder.Logging.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Trace);
builder.Logging.AddNLogWeb();
builder.Logging.AddNLog();

//builder.Services.AddControllers().AddNewtonsoftJson();




builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(
        builder =>
        {
            builder.WithOrigins("http://localhost:4200")
                    .AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });

    options.AddPolicy("AllowSpecificOrigin",

            builder => builder
                .WithOrigins("http://localhost:4200")
                .AllowCredentials()
                .AllowAnyHeader()
                .AllowAnyMethod());
});

builder.Services.AddSpaStaticFiles(configuration =>
{
    var spaOptions = new SpaOptions();
    builder.Configuration.GetSection("SpaOptions").Bind(spaOptions);
    configuration.RootPath = spaOptions.SpaRootPath;
});

var app = builder.Build();



//app.UseCors(builder => builder.AllowAnyOrigin());
app.UseCors(MyAllowSpecificOrigins);



app.MapHub<CandlesHub>("/CandlesHub");
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseMigrationsEndPoint();
    app.UseDeveloperExceptionPage();
    //app.UseExceptionHandler("/Error");
}
app.UseStaticFiles();
app.UseDetection();
app.UseRouting();

app.UseHttpsRedirection();
app.UseSpaStaticFiles();
app.UseAuthentication();
app.UseAuthorization();




Func<HttpContext, bool> IsProxyActive = ctx =>
    AdminController.ProxyEnabledUntil.HasValue &&
    DateTime.UtcNow < AdminController.ProxyEnabledUntil.Value;

// 2) Логика для SPA (Angular): только если прокси не активен и домен НЕ ru-ticker.com
Func<HttpContext, bool> ShouldUseAngular = ctx =>
    !IsProxyActive(ctx) &&
    !ctx.Request.Host.Host.Contains("stock-charts.ru");

// 3) Логика для Razor Pages: только если прокси не активен и домен ru-ticker.com
Func<HttpContext, bool> ShouldUseRazor = ctx =>
     IsProxyActive(ctx) ||
     ctx.Request.Host.Host.Contains("stock-charts.ru");

//app.MapRazorPages();


app.MapWhen(ShouldUseAngular, appBuilder =>
{
    Console.WriteLine("Angular (обычная логика)");
    appBuilder.UseRouting();
    appBuilder.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
        endpoints.MapControllerRoute(
            name: "api",
            pattern: "api/{controller=Home}/{action=Index}/{id?}");
    });
    appBuilder.UseSpa(spa =>
    {
        spa.Options.SourcePath = "ClientApp";
        if (app.Environment.IsDevelopment())
            spa.UseProxyToSpaDevelopmentServer("http://localhost:4200");
        else
            spa.Options.DefaultPage = "/index.html";
    });
});

app.MapWhen(ShouldUseRazor, appBuilder =>
{
    Console.WriteLine("Razor Pages (обычная логика)");
    appBuilder.UseRouting();
    appBuilder.UseAuthorization();
    appBuilder.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
        endpoints.MapRazorPages();
    });
});





app.UseHttpsRedirection();
app.MapControllers();


//app.UseCors();
app.UseCors("AllowSpecificOrigin");


app.Run();
