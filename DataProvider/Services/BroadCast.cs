using Newtonsoft.Json;
using StockChart.EventBus.Abstractions;
using StockChart.Notification.WebApi.RabbitMQ.Subscriptions;
using StockChart.Messages;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

public class BroadCastOptions
{
    public string? apiPath { get; set; }
}

public class BroadCast : IBroadCast
{
    private ITradesCacherRepository _tradesCacher;

    IEventBus _bus;

    public BroadCast(ITradesCacherRepository tradesCacher, IEventBus bus)
    {
        _bus = bus;
        _tradesCacher = tradesCacher;
    }

    public async Task BroadCastCandles(HashSet<string> list)
    {

        try

        {
            await BroadCastClusters(list);
            var array = Subscriber.subscribed_candles.Where(x => list.Contains(x.ticker)).ToArray();

            if (array.Any())
            {
                if (list.Contains("SiU3"))
                {
                    int a = 0;
                    a++;
                }

                var r = _tradesCacher.CandlesQueryBatch(array, 3);
                var send = JsonConvert.SerializeObject(r);
                await _bus.SendAsync(typeof(CandleMessage), new List<CandleMessage> { new CandleMessage() { body = r } }, CancellationToken.None);
                /*   using (StreamWriter sw = System.IO.File.AppendText("c:/log/can.txt"))
                   {
                       sw.WriteLine(DateTime.Now + " " + r.Count + " " + r.Last().Value.Last().ClsPrice);
                   }*/

            }
        }
        catch (Exception e)
        {

            using (StreamWriter sw = System.IO.File.AppendText("c:/log/broad.txt"))
            {
                sw.WriteLine(e);
            }
        }
    }


    public async Task BroadCastClusters(HashSet<string> list)
    {

        //      var list = records.Select(x => x.ticker).Distinct().ToHashSet();
        var array = Subscriber.subscribed_clusters.Where(x => list.Contains(x.ticker) && x.period > 0).ToArray();
        if (array.Any())
        {

            var r = _tradesCacher.ClustersQueryBatch(array, 3);
            var send = JsonConvert.SerializeObject(r);
            await _bus.SendAsync(typeof(ClusterMessage), new List<ClusterMessage> { new ClusterMessage() { body = r } }, CancellationToken.None);
        }

        array = Subscriber.subscribed_clusters.Where(x => list.Contains(x.ticker) && x.period == 0).ToArray();
        if (array.Any())
        {

            var r = _tradesCacher.TickersQueryBatch(array);
            var send = JsonConvert.SerializeObject(r);
            await _bus.SendAsync(typeof(TickerMessage), new List<TickerMessage> { new TickerMessage() { body = r } }, CancellationToken.None);
        }

    }

}