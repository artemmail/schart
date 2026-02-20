using Microsoft.EntityFrameworkCore;
using Quartz;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using StockChart.UpdateService;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Services;
using StockChart.UpdateService.Jobs;
using StockChart.UpdateService.Services;

var builder = Host.CreateApplicationBuilder(args);

var contentRoot = builder.Environment.ContentRootPath;
var parentRoot = Path.GetFullPath(Path.Combine(contentRoot, ".."));
builder.Configuration
    .AddJsonFile(Path.Combine(parentRoot, "appsettings.json"), optional: true, reloadOnChange: true)
    .AddJsonFile(Path.Combine(parentRoot, $"appsettings.{builder.Environment.EnvironmentName}.json"), optional: true, reloadOnChange: true)
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddHttpClient<IMoexApiService, MoexApiService>();
builder.Services.AddHttpClient("SmartLabImportClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.TryAddWithoutValidation(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
    client.DefaultRequestHeaders.TryAddWithoutValidation("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7");
});
builder.Services.AddHttpClient("OpenAiRewriteClient");
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddDbContextFactory<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
builder.Services.Configure<YooMoneyOptions>(builder.Configuration.GetSection("YooMoney"));

builder.Services.AddScoped<IMoexSyncService, MoexSyncService>();
builder.Services.AddScoped<IDividendsMoexService, DividendsMoexService>();
builder.Services.AddScoped<IShareholdersRecommendationsService, ShareholdersRecommendationsService>();
builder.Services.AddScoped<IFinancialStatementsService, FinancialStatementsService>();
builder.Services.AddScoped<IYooMoneyRepository, YooMoneyRepository>();
builder.Services.AddScoped<IBillingRepository, BillingRepository>();
builder.Services.AddScoped<BatchImportOpenPositionsServiceNew>();
builder.Services.AddScoped<LotSizeFileUpdateService>();
builder.Services.AddScoped<OpenAiRewriteService>();
builder.Services.AddScoped<SmartLabTop24hImportService>();

builder.Services
    .AddOptions<UpdateServiceScheduleOptions>()
    .Bind(builder.Configuration.GetSection("UpdateService:Schedules"))
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<UpdateServiceScheduleOptions>, UpdateServiceScheduleOptionsValidator>();
builder.Services
    .AddOptions<LotSizeFileOptions>()
    .Bind(builder.Configuration.GetSection("UpdateService:LotSizeFile"))
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<LotSizeFileOptions>, LotSizeFileOptionsValidator>();
builder.Services
    .AddOptions<SmartLabTop24hOptions>()
    .Bind(builder.Configuration.GetSection("UpdateService:SmartLabTop24h"))
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<SmartLabTop24hOptions>, SmartLabTop24hOptionsValidator>();
builder.Services
    .AddOptions<OpenAiRewriteOptions>()
    .Bind(builder.Configuration.GetSection("McpProvider:OpenAi"));

builder.Services.AddQuartz();

builder.Services.AddQuartzHostedService(options => options.WaitForJobsToComplete = true);

var host = builder.Build();
await ConfigureQuartzSchedulesAsync(host.Services);
await host.RunAsync();

static async Task ConfigureQuartzSchedulesAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var options = scope.ServiceProvider.GetRequiredService<IOptions<UpdateServiceScheduleOptions>>().Value;
    var schedulerFactory = scope.ServiceProvider.GetRequiredService<ISchedulerFactory>();
    var scheduler = await schedulerFactory.GetScheduler();
    /*
    await ScheduleJobAsync<DividendsMoexJob>(
        scheduler,
        new JobKey("DividendsMoexJob"),
        "DividendsMoexJob.Trigger",
        options.DividendsMoexInterval);*/

    await ScheduleJobAsync<MoexSyncJob>(
        scheduler,
        new JobKey("MoexSyncJob"),
        "MoexSyncJob.Trigger",
        options.MoexSyncInterval);

    await ScheduleJobAsync<SmartLabTop24hImportJob>(
        scheduler,
        new JobKey("SmartLabTop24hImportJob"),
        "SmartLabTop24hImportJob.Trigger",
        options.SmartLabTop24hInterval);
    /*
    await ScheduleJobAsync<YooMoneyJob>(
        scheduler,
        new JobKey("YooMoneyJob"),
        "YooMoneyJob.Trigger",
        options.YooMoneyInterval);

    await ScheduleJobAsync<LotSizeFileUpdateJob>(
        scheduler,
        new JobKey("LotSizeFileUpdateJob"),
        "LotSizeFileUpdateJob.Trigger",
        options.LotSizeFileInterval);

    await ScheduleJobAsync<NightlyBatchImportJob>(
        scheduler,
        new JobKey("NightlyBatchImportJob"),
        "NightlyBatchImportJob.Trigger",
        options.NightlyBatchImportCron);*/
}

static async Task ScheduleJobAsync<TJob>(
    IScheduler scheduler,
    JobKey jobKey,
    string triggerKeyName,
    string scheduleExpression)
    where TJob : IJob
{
    if (await scheduler.CheckExists(jobKey))
    {
        await scheduler.DeleteJob(jobKey);
    }

    if (!ScheduleParsing.TryParseSchedule(scheduleExpression, out var schedule))
    {
        throw new FormatException($"Schedule '{scheduleExpression}' is not a valid TimeSpan or Quartz cron expression.");
    }

    var job = JobBuilder.Create<TJob>()
        .WithIdentity(jobKey)
        .Build();

    var triggerBuilder = TriggerBuilder.Create()
        .WithIdentity(triggerKeyName)
        .ForJob(jobKey);

    if (schedule.IsCron)
    {
        triggerBuilder = triggerBuilder.WithCronSchedule(
            schedule.Cron,
            x => x.WithMisfireHandlingInstructionDoNothing());
    }
    else
    {
        triggerBuilder = triggerBuilder
            .StartNow()
            .WithSimpleSchedule(x => x.WithInterval(schedule.Interval).RepeatForever());
    }

    var trigger = triggerBuilder.Build();

    await scheduler.ScheduleJob(job, trigger);
}
