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
    public class DeleteCommentModel : PageModel
    {
        public int Id { get; set; }
        public string Text;
        public string Header;
        public UserManager<ApplicationUser> UserManager;
        public SignInManager<ApplicationUser> SignInManager;
        public DateTime Date;
        ICommentsRepository commentsRepository;
        public DeleteCommentModel(ICommentsRepository topicsRepository,
            SignInManager<ApplicationUser> SignInManager,
            UserManager<ApplicationUser> UserManager)
        {
            this.UserManager = UserManager;
            this.SignInManager = SignInManager;
            this.commentsRepository = topicsRepository;
        }
        [Authorize]
        public async Task<IActionResult> OnGet(int Id)
        {
            var user = this.User.Identity;
            var LoggedInUser = await UserManager.GetUserAsync(base.User);
            var topic = await commentsRepository.GetCommentAsync(Id);
            if (topic == null)
            {
                return NotFound();
            }
            if (LoggedInUser.Id == topic.UserId)
            {
                string txt =  topic.Text.Length < 100 ? topic.Text : topic.Text.Substring(0, 100) ;
                ViewData["Title"] = $"Удалить комментарий {txt}...";
                Date = topic.Date;
                Text = topic.Text;                
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
            var comment = await commentsRepository.GetCommentAsync(Id);
            int id = comment.TopicId;
              await commentsRepository.DeleteCommentAsync(LoggedInUser, Id);
            
            return RedirectToPage($"Details", new { Id = id });
            
        }
    }
}
