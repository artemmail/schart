using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Repository;
using StockChart.Repository.Services;
using System.Net;

namespace StockChart.Pages.Payments
{
    public class YandexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;

        public string response;
        IYooMoneyRepository yoo;
        public YandexModel(ILogger<IndexModel> logger,
            IYooMoneyRepository yoo,
            ICandlesRepository candlesRepository,
            ITickersRepository dic,
            IStockMarketServiceRepository stockMarketServiceRepository)
        {
            this.yoo= yoo;  
            _logger = logger;
            _candlesRepository = candlesRepository;            
            _stockMarketServiceRepository = stockMarketServiceRepository;
        }
        public void OnGet()
        {
            // response = yoo.authorize();            
        }
        
    }
}
