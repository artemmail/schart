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
            var sample = string.Join(",", array.Take(5).Select(x => x.ToString()));

            _logger.LogInformation(
                "Publish SubscribeCandleMessage subscriptions={Subscriptions}",
                array.Length);
            SignalRFlowFileLogger.Write(
                "StockChart.SubscribeRepository.Candles",
                $"subscriptions={array.Length}; sample={sample}");

            await _bus.SendAsync(
                typeof(SubscribeCandleMessage),
                new List<SubscribeCandleMessage> { new SubscribeCandleMessage { body = array } },
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
            var sample = string.Join(",", array.Take(5).Select(x => x.ToString()));

            _logger.LogInformation(
                "Publish SubscribeClusterMessage subscriptions={Subscriptions}",
                array.Length);
            SignalRFlowFileLogger.Write(
                "StockChart.SubscribeRepository.Clusters",
                $"subscriptions={array.Length}; sample={sample}");

            await _bus.SendAsync(
                typeof(SubscribeClusterMessage),
                new List<SubscribeClusterMessage> { new SubscribeClusterMessage { body = array } },
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
    }
}
