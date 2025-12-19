using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;




namespace StockChart.Pages
{


    public class RedirectModel : PageModel
    {

        public RedirectModel(SinglePageService singlePageService
            )
        {

        }


        public IActionResult OnGet()
        {



            return Page();


        }
    }
}