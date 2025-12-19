using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Repository;
namespace StockChart.Pages.Payments
{
    [TypeFilter(typeof(AdminFilter))]
    public class PaymentsTableModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        public PaymentsTableModel(ILogger<IndexModel> logger,
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
            ViewData["Ticker"] = ticker;
        }
        
    }
}
