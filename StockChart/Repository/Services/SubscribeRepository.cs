using Microsoft.Extensions.Options;
using StockChart.EventBus.Abstractions;
using StockChart.EventBus.Models;
using StockChart.Messages;
using StockChart.Model;
using System;
using System.Linq;

namespace StockChart.Repository
{
    public class SubscribeRepository : ISubscribeRepository
    {

        private readonly IEventBus _bus;
        private readonly ILogger<SubscribeRepository> _logger;

        public SubscribeRepository(
            ApplicationDbContext dbContext,
            ITickersRepository tikrep,
            ILogger<SubscribeRepository> logger,
            IOptions<RecieverOptions> options,
            IEventBus bus)
        {
            _bus = bus;
            _logger = logger;
        }

        public async Task Subscribe(SubsCandle[] array)
        {
            array ??= Array.Empty<SubsCandle>();
            var normalized = array.Select(Normalize).ToArray();
            var sample = string.Join(",", normalized.Take(5).Select(x => x.ToString()));

            _logger.LogInformation(
                "Publish SubscribeCandleMessage subscriptions={Subscriptions}",
                normalized.Length);
            SignalRFlowFileLogger.Write(
                "StockChart.SubscribeRepository.Candles",
                $"subscriptions={normalized.Length}; sample={sample}");

            await _bus.SendAsync(
                typeof(SubscribeCandleMessage),
                new List<SubscribeCandleMessage> { new SubscribeCandleMessage { body = normalized } },
                CancellationToken.None);

            /*

            var startTime = DateTime.Now;
            using (var httpClient = new HttpClient())
            {
                var uri = apiPath + $"Subscribe";
                using (var request = new HttpRequestMessage(new HttpMethod("POST"), uri))
                {
                    request.Headers.TryAddWithoutValidation("accept", "text/plain");
                    request.Content = new StringContent(JsonConvert.SerializeObject(array));
                    request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
                    var z = await httpClient.SendAsync(request);
                }
            }*/
        }


        public async Task Subscribe(SubsCluster[] array)
        {
            array ??= Array.Empty<SubsCluster>();
            var normalized = array.Select(Normalize).ToArray();
            var sample = string.Join(",", normalized.Take(5).Select(x => x.ToString()));

            _logger.LogInformation(
                "Publish SubscribeClusterMessage subscriptions={Subscriptions}",
                normalized.Length);
            SignalRFlowFileLogger.Write(
                "StockChart.SubscribeRepository.Clusters",
                $"subscriptions={normalized.Length}; sample={sample}");

            await _bus.SendAsync(
                typeof(SubscribeClusterMessage),
                new List<SubscribeClusterMessage> { new SubscribeClusterMessage { body = normalized } },
                CancellationToken.None);

            /*
            var startTime = DateTime.Now;
            using (var httpClient = new HttpClient())
            {
                var uri = apiPath + $"SubscribeClusters";
                using (var request = new HttpRequestMessage(new HttpMethod("POST"), uri))
                {
                    request.Headers.TryAddWithoutValidation("accept", "text/plain");
                    request.Content = new StringContent(JsonConvert.SerializeObject(array));
                    request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse("application/json");
                    var z = await httpClient.SendAsync(request);
                }
            
            }*/
        }

        private static SubsCandle Normalize(SubsCandle subscription)
        {
            return new SubsCandle
            {
                ticker = NormalizeTicker(subscription?.ticker),
                period = subscription?.period
            };
        }

        private static SubsCluster Normalize(SubsCluster subscription)
        {
            return new SubsCluster
            {
                ticker = NormalizeTicker(subscription?.ticker),
                period = subscription?.period,
                step = subscription?.step ?? 0m
            };
        }

        private static string NormalizeTicker(string? ticker)
        {
            return (ticker ?? string.Empty).Trim().ToUpperInvariant();
        }
    }
}
