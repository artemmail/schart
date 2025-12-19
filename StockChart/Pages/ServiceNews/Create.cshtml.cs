using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Model;
using StockChart.Repository.Interfaces;
namespace StockChart.Pages.ServiceNews
{
    [Authorize]
    public class CreateModel : PageModel
    {
        public int Id { get; set; }
        public string Text;
        public string Header;
        public UserManager<ApplicationUser> UserManager;
        public SignInManager<ApplicationUser> SignInManager;
        public DateTime Date;
        ITopicsRepository topicsRepository;
        public CreateModel(ITopicsRepository topicsRepository,
            SignInManager<ApplicationUser> SignInManager,
            UserManager<ApplicationUser> UserManager)
        {
            this.UserManager = UserManager;
            this.SignInManager = SignInManager;
            this.topicsRepository = topicsRepository;
        }
        [Authorize]
        public async Task<IActionResult> OnGet()
        {
            ViewData["Title"] = "Создание темы";
            Date = DateTime.Now;
            Text = "Содержание";
            Header = "Тема";
            this.Id = 0;
            return Page();
        }
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize]
        public async Task<IActionResult> OnPostAsync(string Text, string Header)
        {
            var user = this.User.Identity;
            var LoggedInUser = await UserManager.GetUserAsync(base.User);
            Guid guid = LoggedInUser.Id;
            if (ModelState.IsValid && !string.IsNullOrWhiteSpace(Text))
            {
                var topic = await topicsRepository.CreateTopicAsync(LoggedInUser, Header, Text);
                if (topic != null)
                    //return await OnGet(Id);
                    return RedirectToPage($"Details", new { Id = topic.Id });
                //return RedirectToAction("Details", "ServiceNews", new { Id = topic.TopicId });                
            }
            return RedirectToPage("Index");
        }
    }
}
