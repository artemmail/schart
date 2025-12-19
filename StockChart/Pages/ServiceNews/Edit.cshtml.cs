using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Model;
using StockChart.Repository.Interfaces;
namespace StockChart.Pages.ServiceNews
{
    [Authorize]
    public class EditModel : PageModel
    {
        public int Id { get; set; }
        public string Text;
        public string Header;
        public UserManager<ApplicationUser> UserManager;
        public SignInManager<ApplicationUser> SignInManager;
        public DateTime Date;
        ITopicsRepository topicsRepository;
        public EditModel(ITopicsRepository topicsRepository,
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
                ViewData["Title"] = "Редактирование комментария";
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
        public async Task<IActionResult> OnPostAsync(string Text, string Header, int Id)
        {
            var user = this.User.Identity;
            var LoggedInUser = await UserManager.GetUserAsync(base.User);
            Guid guid = LoggedInUser.Id;
            if (ModelState.IsValid && !string.IsNullOrWhiteSpace(Text))
            {
                var topic = await topicsRepository.UpdateTopicAsync(LoggedInUser, Id, Header, Text);
                if (topic != null)
                    //return await OnGet(Id);
                    return RedirectToPage($"Details", new { Id = topic.Id });
                //return RedirectToAction("Details", "ServiceNews", new { Id = topic.TopicId });                
            }
            return RedirectToPage("Index");
        }
    }
}
