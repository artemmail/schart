using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Newtonsoft.Json;
using StockChart.Model;
using StockChart.Repository;
namespace StockChart.Pages.FootPrint
{
    //[Authorize]
    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        ISettingsRepository _settingsRepository;
        public object preset;
        public int ProfileId;
        public UserManager<ApplicationUser> UserManager;

        public IndexModel(ILogger<IndexModel> logger,
            ICandlesRepository candlesRepository,
            ISettingsRepository settingsRepository,
            UserManager<ApplicationUser> userManager,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            _logger = logger;
            _candlesRepository = candlesRepository;
            _stockMarketServiceRepository = stockMarketServiceRepository;
            _settingsRepository = settingsRepository;
            this.UserManager = userManager;
        }
        public async Task OnGet(string? ticker, decimal priceStep,
            DateTime? startDate, DateTime? endDate, bool? Postmarket, string rperiod = "day", decimal period = 5)
        {

            if (ticker == null)
            {
                ticker = "GAZP";
            }
            ViewData["LastDate"] = _stockMarketServiceRepository.LastTradingDateCached(0).ToString("dd.MM.yyyy");
            if (string.IsNullOrEmpty(rperiod) && period == null)
            {
                rperiod = "day";
                period = 15;
            }
            _stockMarketServiceRepository.UpdateAlias(ref ticker);

            bool timeEnable = false;
            string startTime = null;
            string endTime = null;

            if (startDate.HasValue && endDate.HasValue)
            {
                if (startDate.Value.Date != startDate.Value || endDate.Value.Date != endDate.Value)
                {
                    timeEnable = true;
                    startTime = $"{startDate.Value.Hour}:{startDate.Value.Minute}";
                    endTime = $"{endDate.Value.Hour}:{endDate.Value.Minute}";
                }

            }

            string sd = null;
            string ed = null;

            if (startDate.HasValue)
                sd = startDate.Value.ToString("dd.MM.yyyy");

            if (endDate.HasValue)
                ed = endDate.Value.ToString("dd.MM.yyyy");


            var u = await UserManager.GetUserAsync(base.User);
            ChartSettings cs;

            if (period != 0)
                cs = await _settingsRepository.GetDefaultSettingsAsync(u, ticker);
            else
                cs = await _settingsRepository.GetChartSettingsAsync(null, 567);

            this.ProfileId = cs.Id;

            /*
            if (ProfileId.HasValue)
            {
                this.ProfileId = ProfileId.Value;
            }
            else
            {
                
                if (u != null)
                    this.ProfileId = (await _settingsRepository.GetDefaultSettingsAsync(u)).Id;
                else
                    this.ProfileId = 510;
            }*/


            var result =
              _stockMarketServiceRepository.CandlesParamsToObject(ticker, priceStep, period, rperiod, sd, ed,
                    timeEnable, startTime, endTime, true, cs.CandlesOnly ? "Candles" : "Cluster");





            preset = JsonConvert.SerializeObject(result);
        }
    }
}
