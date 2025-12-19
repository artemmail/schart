using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Repository;
using StockChart.Repository.Services;
using System.Net;
using Wangkanai.Detection.Services;




namespace StockChart.Pages
{
    public class Operation
    {
        public string group_id { get; set; }
        public string operation_id { get; set; }
        public string title { get; set; }
        public double amount { get; set; }
        public string direction { get; set; }
        public DateTime datetime { get; set; }
        public string label { get; set; }
        public string status { get; set; }
        public string type { get; set; }
        public List<SpendingCategory> spendingCategories { get; set; }
        public string amount_currency { get; set; }
        public bool is_sbp_operation { get; set; }
    }

    public class Root
    {
        public string next_record { get; set; }
        public List<Operation> operations { get; set; }
    }

    public class SpendingCategory
    {
        public string name { get; set; }
        public double sum { get; set; }
    }

    public class Http3Handler : DelegatingHandler
    {
        public Http3Handler() { }
        public Http3Handler(HttpMessageHandler innerHandler) : base(innerHandler) { }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            request.Version = HttpVersion.Version30;
            request.VersionPolicy = HttpVersionPolicy.RequestVersionExact;

            return base.SendAsync(request, cancellationToken);
        }
    }

    public class IndexModel : PageModel
    {
        public NewsTableModel _newsTableModel;
        IDetectionService detectionService;
        IYooMoneyRepository yoo;
        ICandlesRepository can;
        ILogger<IndexModel> log;
        SinglePageService singlePageService_;
        public IndexModel(IYooMoneyRepository yoo, StockProcContext dbContext, IDetectionService detectionService,
            ICandlesRepository can, ILogger<IndexModel> log, SinglePageService singlePageService
            )
        {
            singlePageService_ = singlePageService;
            this.log = log;
            this.can = can;
            this.yoo = yoo;
            this.detectionService = detectionService;
            _newsTableModel = new NewsTableModel(dbContext);
        }

        static bool b = true;
        public async Task<IActionResult> OnGet()
        {
            return Page();

            /*
            // Проверка типа устройства
            if (detectionService.Device.Type == Device.Mobile)
            {
                // Перенаправление на мобильную версию страницы
                return RedirectToPage("Mobile");
            }*/

            // Возвращение файла index.html

            var b = await singlePageService_.GetSinglePageAsync();
            if (!b)
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html");
                return PhysicalFile(filePath, "text/html");
            }

            return Page();

        }
    }
}