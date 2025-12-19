using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace StockChart.Pages.Admin
{
    // [Authorize]
    public class IndexModel : PageModel
    {

        [BindProperty]
        [HiddenInput]
        public string filename { get; set; } = null;

        [BindProperty]
        [HiddenInput]
        public string name { get; set; } = null;

        public async Task<IActionResult> OnPostAsync()
        {
            return Page();
        }
    }
}