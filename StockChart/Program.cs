
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OAuth;
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
using StockChart.Controllers;
using StockChart.Hubs;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Moex.OptionCalc;
using StockChart.Repository.Services;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
var MyAllowSpecificOrigins = "AllowSpecificOrigin";// "_myAllowSpecificOrigins";
var builder = WebApplication.CreateBuilder(args);
// Add services to the container.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
builder.Services.AddHttpClient();
builder.Services.AddDatabaseDeveloperPageExceptionFilter();
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
/*
builder.Services.AddDefaultIdentity<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddEntityFrameworkStores<ApplicationDbContext>();
*/
builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options => options.SignIn.RequireConfirmedAccount = true)
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var yandexClientId = builder.Configuration["Authentication:Yandex:ClientId"];
var yandexClientSecret = builder.Configuration["Authentication:Yandex:ClientSecret"];
var authenticationBuilder = builder.Services.AddAuthentication();

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authenticationBuilder.AddGoogle("Google", options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.CallbackPath = "/signin-google";
        options.SaveTokens = true;
        options.Scope.Add("email");
        options.AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
        options.TokenEndpoint = "https://www.googleapis.com/oauth2/v4/token";
        options.UserInformationEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo";

        var backchannelHandler = new HttpClientHandler
        {
            AllowAutoRedirect = false,
            UseCookies = false
        };

        if (backchannelHandler.SupportsAutomaticDecompression)
        {
            backchannelHandler.AutomaticDecompression =
                DecompressionMethods.GZip | DecompressionMethods.Deflate;
        }

        var backchannelClient = new HttpClient(backchannelHandler)
        {
            Timeout = options.BackchannelTimeout,
            DefaultRequestVersion = HttpVersion.Version11,
#if NET8_0_OR_GREATER
            DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower,
#endif
            MaxResponseContentBufferSize = 1024 * 1024 * 10
        };

        backchannelClient.DefaultRequestHeaders.Accept.Add(
            new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
        backchannelClient.DefaultRequestHeaders.UserAgent.Add(
            new System.Net.Http.Headers.ProductInfoHeaderValue("Microsoft.AspNetCore.Authentication.OAuth", "1.0"));
        backchannelClient.DefaultRequestHeaders.UserAgent.Add(
            new System.Net.Http.Headers.ProductInfoHeaderValue("Microsoft.AspNetCore.Authentication.Google", "1.0"));

        options.BackchannelHttpHandler = backchannelHandler;
        options.Backchannel = backchannelClient;
    });
}

if (!string.IsNullOrWhiteSpace(yandexClientId) && !string.IsNullOrWhiteSpace(yandexClientSecret))
{
    authenticationBuilder.AddOAuth("Yandex", "Yandex", options =>
    {
        options.ClientId = yandexClientId;
        options.ClientSecret = yandexClientSecret;
        options.CallbackPath = "/signin-yandex";
        options.AuthorizationEndpoint = "https://oauth.yandex.com/authorize";
        options.TokenEndpoint = "https://oauth.yandex.com/token";
        options.UserInformationEndpoint = "https://login.yandex.ru/info?format=json";
        options.SaveTokens = true;
        options.Scope.Add("login:email");

        options.ClaimActions.Clear();
        options.ClaimActions.MapJsonKey(ClaimTypes.NameIdentifier, "id");
        options.ClaimActions.MapJsonKey(ClaimTypes.Name, "real_name");
        options.ClaimActions.MapJsonKey(ClaimTypes.Email, "default_email");
        options.ClaimActions.MapJsonKey("urn:yandex:login", "login");
        options.ClaimActions.MapJsonKey("urn:yandex:display_name", "display_name");

        options.Events = new OAuthEvents
        {
            OnCreatingTicket = async context =>
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, context.Options.UserInformationEndpoint);
                request.Headers.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("OAuth", context.AccessToken);

                using var response = await context.Backchannel.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.HttpContext.RequestAborted);

                response.EnsureSuccessStatusCode();

                await using var responseStream =
                    await response.Content.ReadAsStreamAsync(context.HttpContext.RequestAborted);
                using var payload = await JsonDocument.ParseAsync(
                    responseStream,
                    cancellationToken: context.HttpContext.RequestAborted);

                context.RunClaimActions(payload.RootElement);
            }
        };
    });
}
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
builder.Services.AddScoped<DbContext, ApplicationDbContext>();
builder.Services.AddSingleton<ITickersRepository, TickersRepository>();
builder.Services.AddScoped<ITopicsRepository, TopicsRepository>();
builder.Services.AddScoped<UserMenuGuidesTopicsImporter>();
builder.Services.AddScoped<ICommentsRepository, CommentsRepository>();
builder.Services.AddScoped<IPortfoiloRepository, PortfoiloRepository>();
builder.Services.AddScoped<ICandlesRepository, CandlesRepository>();
builder.Services.AddScoped<ICandlesRepositorySet, CandlesRepositorySet>();
builder.Services.AddScoped<IClusterRepository, ClusterRepository>();
builder.Services.AddScoped<IPaymentsRepository, PaymentsRepository>();
builder.Services.AddScoped<IUsersRepository, UsersRepository>();
builder.Services.AddScoped<ISettingsRepository, SettingsRepository>();
builder.Services.AddScoped<IFootprintFavoritesRepository, FootprintFavoritesRepository>();
builder.Services.AddScoped<IFootprintLevelMarksRepository, FootprintLevelMarksRepository>();
builder.Services.AddSingleton<IMoexApiService, MoexApiService>();
builder.Services.AddScoped<IDividendsMoexService, DividendsMoexService>();
builder.Services.AddScoped<IShareholdersRecommendationsService, ShareholdersRecommendationsService>();
builder.Services.AddScoped<IFinancialStatementsService, FinancialStatementsService>();
builder.Services.AddScoped<IMoexSyncService, MoexSyncService>();
builder.Services.AddScoped<IInstrumentRelationsService, InstrumentRelationsService>();
builder.Services.AddScoped<IBondsQueryService, BondsQueryService>();
builder.Services.AddMoexOptionCalc(options => builder.Configuration.GetSection("MoexOptionCalc").Bind(options));
builder.Services.AddScoped<IOptionCalcPortfolioBuilder, OptionCalcPortfolioBuilder>();
builder.Services.AddScoped<IReportsRepository, ReportsRepository>();
builder.Services.AddScoped<IBillingRepository, BillingRepository>();
builder.Services.AddScoped<IPortfoiloRepository, PortfoiloRepository>();
builder.Services.AddScoped<ISubscribeRepository, SubscribeRepository>();
builder.Services.AddScoped<IImageStoreRepository, ImageStoreRepository>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<SinglePageService>();
builder.Services.AddScoped<BatchImportOpenPositionsService>();
builder.Services.AddSingleton<BatchImportOpenPositionsServiceNew>();
builder.Services.Configure<CacheConfiguration>(builder.Configuration.GetSection("CacheConfiguration"));
builder.Services.Configure<RecieverOptions>(builder.Configuration.GetSection("RecieverOptions"));
builder.Services.Configure<YooMoneyOptions>(builder.Configuration.GetSection("YooMoney"));
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.AddRabbitMq(builder.Configuration.GetSection("EventBus"));
builder.Services.AddSubscriber<ClusterSubscriber>();
//For In-Memory Caching
builder.Services.AddMemoryCache();
///builder.Services.Configure<AuthMessageSenderOptions>(builder.Configuration);
builder.Services.AddScoped<IEmailSender, EmailSender>();
builder.Services.AddScoped<IYooMoneyRepository, YooMoneyRepository>();
builder.Services.AddScoped<YooMoneyTokenConfigStoreMain>();
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
//builder.Services.AddScoped<IScopedProcessingService, ScopedProcessingService>();
builder.Services.AddSingleton<IPasswordHasher<ApplicationUser>, PasswordHasherWithOldMembershipSupport>();
builder.Services.AddScoped<IAuthorizationHandler, SampleAuthorizationHandler>();
builder.Services.AddDetection();
builder.Logging.ClearProviders();
builder.Logging.SetMinimumLevel(Microsoft.Extensions.Logging.LogLevel.Trace);
builder.Logging.AddNLogWeb();
builder.Logging.AddNLog();
//builder.Services.AddControllers().AddNewtonsoftJson();
builder.Services.AddCors(options =>
{
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

// One-off content import: docs -> Topics (HTML) for main page feed.
// Usage:
//   dotnet run -- --import-user-menu-guides --import-user=ruticker [--update-existing] [--dry-run] [--notify-yandex]
if (args.Any(a => string.Equals(a, "--import-user-menu-guides", StringComparison.OrdinalIgnoreCase)))
{
    using var scope = app.Services.CreateScope();
    var sp = scope.ServiceProvider;

    var dryRun = args.Any(a => string.Equals(a, "--dry-run", StringComparison.OrdinalIgnoreCase));
    var updateExisting = args.Any(a => string.Equals(a, "--update-existing", StringComparison.OrdinalIgnoreCase));
    var notifyYandex = args.Any(a => string.Equals(a, "--notify-yandex", StringComparison.OrdinalIgnoreCase));

    var userNameArg = args.FirstOrDefault(a => a.StartsWith("--import-user=", StringComparison.OrdinalIgnoreCase));
    var userName = !string.IsNullOrWhiteSpace(userNameArg)
        ? userNameArg.Substring("--import-user=".Length)
        : "ruticker";

    var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();
    var user = await userManager.FindByNameAsync(userName);
    if (user == null)
    {
        Console.WriteLine($"User not found: {userName}");
        return;
    }

    var importer = sp.GetRequiredService<UserMenuGuidesTopicsImporter>();
    var result = await importer.ImportAsync(user, new UserMenuGuidesTopicsImportOptions(DryRun: dryRun, UpdateExisting: updateExisting));

    Console.WriteLine(
        $"UserMenuGuides import: dir='{result.DocsDirectory}' files={result.TotalFiles} created={result.CreatedCount} updated={result.UpdatedCount} skipped={result.SkippedCount} errors={result.Errors.Count}");

    if (notifyYandex && !dryRun && result.CreatedSlugs.Count > 0)
    {
        var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient();
        foreach (var slug in result.CreatedSlugs)
        {
            try
            {
                var baseUrl = "https://yandex.com/indexnow";
                var url = $"https://stockchart.ru/ServiceNews/Content/{slug}";
                var key = "f59e3d2c25e394fb";
                var fullUrl = $"{baseUrl}?url={url}&key={key}";

                var resp = await http.GetAsync(fullUrl);
                Console.WriteLine($"IndexNow {slug}: {(int)resp.StatusCode}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"IndexNow {slug}: {ex.Message}");
            }
        }
    }

    if (result.Errors.Count > 0)
    {
        foreach (var e in result.Errors)
        {
            Console.WriteLine(e);
        }
    }

    return;
}
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
app.UseCors(MyAllowSpecificOrigins);
Func<HttpContext, bool> ShouldForceHttps = ctx =>
{
    var host = ctx.Request.Host.Host;
    if (string.IsNullOrWhiteSpace(host))
        return false;

    if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        return false;

    if (IPAddress.TryParse(host, out var ip) && IPAddress.IsLoopback(ip))
        return false;

    return true;
};
app.UseWhen(ShouldForceHttps, branch => branch.UseHttpsRedirection());
app.UseSpaStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
Func<HttpContext, bool> IsProxyActive = ctx =>
    AdminController.ProxyEnabledUntil.HasValue &&
    DateTime.UtcNow < AdminController.ProxyEnabledUntil.Value;
// 2) Логика для SPA (Angular): только если прокси не активен и домен НЕ ru-ticker.com
Func<HttpContext, bool> ShouldUseAngular = ctx =>
    !IsProxyActive(ctx) &&
    !ctx.Request.Host.Host.Contains("1stock-charts.ru");
// 3) Логика для Razor Pages: только если прокси не активен и домен ru-ticker.com
Func<HttpContext, bool> ShouldUseRazor = ctx =>
     IsProxyActive(ctx) ||
     ctx.Request.Host.Host.Contains("1stock-charts.ru");
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
    appBuilder.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
        endpoints.MapRazorPages();
    });
});
app.MapControllers();
app.Run();
