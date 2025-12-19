using Microsoft.Extensions.Options;
using StockChart.EventBus.Abstractions;
using StockChart.EventBus.Models;
using StockChart.Messages;
using StockChart.Model;

namespace StockChart.Repository
{
    public class SubscribeRepository : ISubscribeRepository
    {



        IEventBus _bus;


        public SubscribeRepository(StockProcContext dbContext, ITickersRepository tikrep, ILogger<CandlesRepository> logger, IOptions<RecieverOptions> options, IEventBus bus)
        {

            _bus = bus;


        }

        public async Task Subscribe(SubsCandle[] array)
        {
            await _bus.SendAsync(typeof(SubscribeCandleMessage), new List<SubscribeCandleMessage> { new SubscribeCandleMessage() { body = array } }, CancellationToken.None);

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


            await _bus.SendAsync(typeof(SubscribeClusterMessage), new List<SubscribeClusterMessage> { new SubscribeClusterMessage() { body = array } }, CancellationToken.None);

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
