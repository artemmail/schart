using Binance.Net.Clients;
using DataProvider.Models;
using DataProvider.Services;
using Microsoft.Extensions.Hosting;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace DataProvider
{
    public class HostetBinanceService : IHostedService, IDisposable
    {
        ITradesCacherRepository tradesCacher;
        IBroadCast _broadCast;
        public HostetBinanceService(ITradesCacherRepository tradesCacher, IBroadCast broadCast)
        {
            _broadCast = broadCast;
            this.tradesCacher = tradesCacher;
        }
        public Task StartAsync(CancellationToken stoppingToken)
        {
            int t = 0;
            t++;


            DateTime initTime = DateTime.Now;

            Task.Run(async () =>
            {
                using (var socketClient = new BinanceSocketClient())
                {
                    string[] s = MarketInfoServiceHolder.GetTickers()
                        .Where(x => x.Value.market == 20)
                        .Select(x => x.Key)
                        .Take(210)
                        .ToArray();
                    var subscription = await socketClient.SpotApi.ExchangeData.SubscribeToTradeUpdatesAsync(s, data =>
                    {
                        var d = data.Data;
                        DBRecord record = new DBRecord()
                        {
                            OI = 0,
                            datetime = new DateTime((d.TradeTime).Ticks),
                            price = d.Price,
                            quantity = d.Quantity,
                            volume = d.Price * d.Quantity,
                            direction = d.BuyerIsMaker ? 0 : 1,
                            market = 20,
                            number = d.Id,
                            ticker = d.Symbol,
                            name = d.Symbol,
                            marketcode = "Binance"
                        };

                        tradesCacher.PushTrade(record.ticker, new Trade(record));
                        HostetDBWriterService.Enqueue(1, record);



                    });
                    if (!subscription.Success)
                    {
                        Console.WriteLine("Failed to sub: " + subscription.Error);
                        Console.ReadLine();
                        return;
                    }
                    while (subscription.Success) ;
                    subscription.Data.ConnectionLost += () => Console.WriteLine("Connection lost, trying to reconnect..");
                    subscription.Data.ConnectionRestored += (t) => Console.WriteLine("Connection restored");
                    await socketClient.UnsubscribeAllAsync();
                }
            }
                );
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }
        public void Dispose()
        {
        }
    }
}
