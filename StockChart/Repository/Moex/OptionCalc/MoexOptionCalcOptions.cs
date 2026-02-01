using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Services;

namespace StockChart.Repository.Moex.OptionCalc
{
    public sealed class MoexOptionCalcOptions
    {
        /// <summary>
        /// Base address for MOEX Options Calculator API.
        /// Production: https://iss.moex.com/iss/apps/option-calc/v1/
        /// </summary>
        public Uri BaseUri { get; set; } = new("https://iss.moex.com/iss/apps/option-calc/v1/");
    }

    public static class MoexOptionCalcServiceCollectionExtensions
    {
        /// <summary>
        /// Registers typed HttpClient and options for the MOEX option-calc API.
        /// </summary>
        public static IHttpClientBuilder AddMoexOptionCalc(
            this IServiceCollection services,
            Action<MoexOptionCalcOptions>? configure = null)
        {
            if (configure != null)
            {
                services.Configure(configure);
            }
            else
            {
                services.Configure<MoexOptionCalcOptions>(_ => { });
            }

            return services.AddHttpClient<IMoexOptionCalcService, MoexOptionCalcService>((sp, http) =>
            {
                var options = sp.GetRequiredService<IOptions<MoexOptionCalcOptions>>().Value;
                http.BaseAddress = options.BaseUri;
                http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
            });
        }
    }
}
