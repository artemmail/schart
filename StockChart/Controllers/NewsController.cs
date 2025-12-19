using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;

namespace StockChart.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NewsController : ControllerBase
    {

        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public NewsController(

            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager)
        {

            _signInManager = signInManager;
            _userManager = userManager;
        }



        [HttpGet("issignedin")]
        public IActionResult IsSignedIn()
        {
            return Ok(_signInManager.IsSignedIn(User));
        }

        [HttpGet("loggeduser")]
        [Authorize]
        public async Task<IActionResult> GetLoggedUser()
        {
            var loggedUser = await _userManager.GetUserAsync(User);
            return Ok(new
            {
                loggedUser.Id,
                loggedUser.UserName
            });
        }


    }
}