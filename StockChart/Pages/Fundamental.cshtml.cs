using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace StockChart.Pages
{
    public class FundamentalModel : PageModel
    {
        public IActionResult OnGet(string reportingStandard, string ticker, string numberOfShares)
        {
            // Проверка, что параметры получены
            if (string.IsNullOrEmpty(reportingStandard) || string.IsNullOrEmpty(ticker) || string.IsNullOrEmpty(numberOfShares))
            {
                // Если параметры отсутствуют или некорректны, можно вернуть ошибку или сообщение
                return Page();
            }

            // Логика может быть добавлена здесь перед перенаправлением
            // Перенаправляем на страницу FootPrint с параметрами
            return RedirectToPage("/FootPrint/Index", new { ticker });
        }
    }
}
