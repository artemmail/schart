using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace StockChart.Pages
{
    public class StatementsModel : PageModel
    {
        public IActionResult OnGet( string ticker)
        {
           

            // Логика может быть добавлена здесь перед перенаправлением
            // Перенаправляем на страницу FootPrint с параметрами
            return RedirectToPage("/FootPrint/Index", new { ticker });
        }
    }
}
