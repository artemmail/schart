using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using SignalRMvc.Hubs;
using StockChart.EventBus.Models;
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
        ApplicationDbContext dbContext;
        IHubContext<CandlesHub> _hubContext;

        public BroadCastController(
            ApplicationDbContext dbContext,
            ICandlesRepository candlesRepository,
            ITickersRepository tickers,
            IStockMarketServiceRepository stockMarketServiceRepository,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IHubContext<CandlesHub> hubContext
            )
        {
            _hubContext = hubContext;
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
                    await _hubContext.Clients.Group(k.ToString()).SendCoreAsync("recieveCandle", new object[] { JsonConvert.SerializeObject(res) });
                }
            }
        }


        [HttpPost("PostCluster")]
        public async Task PostCluster([FromBody] string? aaa)
        {
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
                    await _hubContext.Clients.Group(k.ToString()).SendCoreAsync("receiveCluster", new object[] { JsonConvert.SerializeObject(rxx[k]) });
                }
            }
        }


    }
}
