using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Repository;
namespace StockChart.Pages.Seasonality
{
    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        public string ticker;
        public IndexModel(ILogger<IndexModel> logger,
            ICandlesRepository candlesRepository,
            ITickersRepository dic,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            _logger = logger;
            _candlesRepository = candlesRepository;            
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }
        public void OnGet(string ticker)
        {
            _stockMarketServiceRepository.UpdateAlias(ref ticker);
            this.ticker = ticker;
        }
        
    }
}
