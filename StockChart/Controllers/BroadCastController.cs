using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using StockChart.EventBus.Models;
using SignalRMvc.Hubs;
using StockChart.Extentions;
using StockChart.Model;
using StockChart.Repository;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class BroadCastController : Controller
    {
        public UserManager<ApplicationUser> UserManager;

        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        ITickersRepository _tickers;
        SignInManager<ApplicationUser> SignInManager;
        StockProcContext dbContext;
        CandlesHub _uptimeHub;

        public BroadCastController(
            StockProcContext dbContext,
            ICandlesRepository candlesRepository,
            ITickersRepository tickers,
            IStockMarketServiceRepository stockMarketServiceRepository,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
             CandlesHub uptimeHub
            )
        {
            _uptimeHub = uptimeHub;
            this.dbContext = dbContext;
            this.UserManager = userManager;
            SignInManager = signInManager;
            _tickers = tickers;
            _candlesRepository = candlesRepository;
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }

        [HttpPost("Post")]
        public async Task Post([FromBody] string? aaa)
        {
            if (_uptimeHub.Clients == null)
                return;

            var cp = JsonConvert.DeserializeObject<Dictionary<string, List<Candle>>>(aaa);

            //Dictionary<string, List<BaseCandle>> cp = new Dictionary<string, List<BaseCandle>>();
            var rxx = new Dictionary<SubsCandle, List<Candle>>();
            foreach (var k in cp.Keys)
            {
                var k2 = SubsCandle.Parse(k);

                rxx[k2] = cp[k];
            }

            foreach (var k in rxx.Keys.ToArray())
            {
                if (rxx[k].Any())
                {
                    var candles = rxx[k];
                    var res = new { key = new { k.ticker, k.period }, data = CandlePacker.PackCandlesResult(candles, false) };
                    await _uptimeHub.Clients.Group(k.ToString()).SendCoreAsync("recieveCandle", new object[] { JsonConvert.SerializeObject(res) });
                }
            }
        }


        [HttpPost("PostCluster")]
        public async Task PostCluster([FromBody] string? aaa)
        {
            return;

            if (_uptimeHub.Clients == null)
                return;


            var cp = JsonConvert.DeserializeObject<Dictionary<string, List<ClusterColumnWCF>>>(aaa);

            //Dictionary<string, List<BaseCandle>> cp = new Dictionary<string, List<BaseCandle>>();
            var rxx = new Dictionary<SubsCluster, List<ClusterColumnWCF>>();

            foreach (var k in cp.Keys)
            {
                var k2 = SubsCluster.Parse(k);

                rxx[k2] = cp[k];
            }

            foreach (var k in rxx.Keys.ToArray())
            {
                if (rxx[k].Any())
                {
                    await _uptimeHub.Clients.Group(k.ToString()).SendCoreAsync("recieveCluster", new object[] { JsonConvert.SerializeObject(rxx[k]) });
                }
            }
        }


    }
}
