using Microsoft.AspNetCore.Mvc;
using StockChart.EventBus.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace DataProvider
{
    [Route("api/[controller]")]
    [ApiController]
    public class CandlesController : ControllerBase
    {

        ITradesCacherRepository _tradesCacher;

        public CandlesController(ITradesCacherRepository tradesCacher)
        {
            _tradesCacher = tradesCacher;
        }

        [HttpGet("status")]
        public object status()
        {
            object[] res = new object[2];

            for (int i = 0; i < 2; i++)
            {
                res[i] = new
                {
                    source = i == 0 ? "quick" : "binance",
                    first = HostetDBWriterService.sqlQueues[i].Any() ? HostetDBWriterService.sqlQueues[i].First().datetime : new DateTime(2000, 1, 1),
                    last = HostetDBWriterService.sqlQueues[i].Any() ? HostetDBWriterService.sqlQueues[i].Last().datetime : new DateTime(2000, 1, 1),
                    count = HostetDBWriterService.sqlQueues[i].Count
                };
            }
            return res;
        }

        /*
        [HttpGet("CandlesQuery/{ticker}")]
        public async Task<IEnumerable<CandleX>> CandlesQuery(string ticker, double period, DateTime startDate, DateTime endDate)
        {
           return await Task.FromResult(_tradesCacher.CandlesQuery(ticker.ToUpper(), period, startDate, endDate));
        }*/




        [HttpGet("CandlesQuery/{ticker}")]
        public List<BaseCandle> CandlesQuery(string ticker, double period, DateTime startDate, DateTime endDate)
        {
            try
            {
                return _tradesCacher.CandlesQuery(ticker.ToUpper(), period, startDate, endDate);
            }
            catch (Exception ex)
            {

                Console.WriteLine(ex.Message);
                return new List<BaseCandle>();
            }
        }


        [HttpGet("Ticks/{ticker}")]
        public List<tick> Ticks(string ticker, DateTime startDate, DateTime endDate)
        {
            try
            {
                return _tradesCacher.TicksQuery(ticker.ToUpper(), startDate, endDate);
            }
            catch (Exception ex)
            {

                Console.WriteLine(ex.Message);
                return new List<tick>();
            }
        }






        [HttpGet("ClusterProfileQuery/{ticker}")]
        public async Task<IEnumerable<ClusterColumnWCF>> ClusterProfileQuery(string ticker, double period, DateTime startDate, DateTime endDate, decimal step)
        {
            Console.WriteLine($"Cluster {ticker},{period},{startDate},{endDate},{step}");
            return await Task.FromResult(_tradesCacher.ClusterProfileQuery(new SubsCluster() { ticker = ticker.ToUpper(), period = period, step = step }, startDate, endDate));
        }

        /*
        [HttpGet("RefreshAlerts")]
        public void RefreshAlerts()
        {
            TradesCacherRepository.watcher.Refresh();
        }*/

        [HttpGet("CleanUp")]
        public void CleanUp()
        {
            _tradesCacher.CleanUp();
            GC.Collect();
        }

        [HttpGet("CachedList")]
        public string[] CachedList()
        {
            return _tradesCacher.CachedClusterSubscriptions();
        }
    }
}
