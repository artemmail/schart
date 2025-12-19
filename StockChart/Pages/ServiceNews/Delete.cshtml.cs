using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;
namespace StockChart.Pages.ServiceNews
{
    [Authorize]
    public class DeleteModel : PageModel
    {
        public int Id { get; set; }
        public string Text;
        public string Header;
        public UserManager<ApplicationUser> UserManager;
        public SignInManager<ApplicationUser> SignInManager;
        public DateTime Date;
        ITopicsRepository topicsRepository;
        public DeleteModel(ITopicsRepository topicsRepository,
            SignInManager<ApplicationUser> SignInManager,
            UserManager<ApplicationUser> UserManager)
        {
            this.UserManager = UserManager;
            this.SignInManager = SignInManager;
            this.topicsRepository = topicsRepository;
        }
        [Authorize]
        public async Task<IActionResult> OnGet(int Id)
        {
            var user = this.User.Identity;
            var LoggedInUser = await UserManager.GetUserAsync(base.User);
            var topic = await topicsRepository.GetTopicAsync(Id);
            if (topic == null)
            {
                return NotFound();
            }
            if (LoggedInUser.Id == topic.UserId)
            {
                ViewData["Title"] = "Удалить тему "+topic.Header;
                Date = topic.Date;
                Text = topic.Text;
                Header = topic.Header;
                this.Id = topic.Id;
                return Page();
            }
            return RedirectToPage($"/");
        }
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize]
        public async Task<IActionResult> OnPostAsync(int Id)
        {
            var user = this.User.Identity;
            var LoggedInUser = await UserManager.GetUserAsync(base.User);
            Guid guid = LoggedInUser.Id;
           
              await topicsRepository.DeleteTopicAsync(LoggedInUser, Id);
                
                    //return await OnGet(Id);
                return RedirectToPage("/Index");
                //return RedirectToAction("Details", "ServiceNews", new { Id = topic.TopicId });                
           
           // return RedirectToPage("Index");
        }
    }
}
