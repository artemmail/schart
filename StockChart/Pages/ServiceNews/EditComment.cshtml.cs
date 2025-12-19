using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Model;
using StockChart.Repository;
namespace StockChart.Pages.ServiceNews
{
    [Authorize]
    public class EditCommentModel : PageModel
    {
        public int Id { get; set; }
        public string Text;
        public UserManager<ApplicationUser> UserManager;
        public SignInManager<ApplicationUser> SignInManager;
        public DateTime Date;
        ICommentsRepository commentsRepository;
        public EditCommentModel(ICommentsRepository commentsRepository,
            SignInManager<ApplicationUser> SignInManager,
            UserManager<ApplicationUser> UserManager)
        {
            this.UserManager = UserManager;
            this.SignInManager = SignInManager;
            this.commentsRepository = commentsRepository;
        }
        [Authorize]
        public async Task<IActionResult> OnGet(int Id)
        {
            var user = this.User.Identity;
            var LoggedInUser = await UserManager.GetUserAsync(base.User);
            var Comment = await commentsRepository.GetCommentAsync(Id);
            if (Comment == null)
            {
                return NotFound();
            }
            if (LoggedInUser.Id == Comment.UserId)
            {
                ViewData["Title"] = "Редактирование комментария";
                Date = Comment.Date;
                Text = Comment.Text;
                this.Id = Comment.Id;
                return Page();
            }
            return RedirectToPage($"/");
        }
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize]
        public async Task<IActionResult> OnPostAsync(string Text, int Id)
        {
            var user = this.User.Identity;
            var LoggedInUser = await UserManager.GetUserAsync(base.User);
            Guid guid = LoggedInUser.Id;
            if (ModelState.IsValid && !string.IsNullOrWhiteSpace(Text))
            {
                var comment = await commentsRepository.UpdateCommentAsync(LoggedInUser, Id, Text);
                if (comment != null)
                    //return await OnGet(Id);
                    return RedirectToPage($"Details", new { Id = comment.TopicId });
                //return RedirectToAction("Details", "ServiceNews", new { Id = comment.TopicId });                
            }
            return RedirectToPage("Index");
        }
    }
}
