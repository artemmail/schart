using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;




namespace StockChart.Pages
{


    public class ToggleModel : PageModel
    {
        SinglePageService singlePageService_;
        public ToggleModel(SinglePageService singlePageService
            )
        {
            singlePageService_ = singlePageService;
        }


        public async Task<IActionResult> OnGet()
        {

            var b = await singlePageService_.ToggleSinglePageAsync();

            return RedirectToPage(b ? "Redirect" : "Index");


        }
    }
}