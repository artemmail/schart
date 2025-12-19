using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using StockChart.Model;
using StockChart.Repository;
using StockChart.Repository.Interfaces;
namespace StockChart.Pages.ServiceNews
{
    public class DetailsModel : PageModel
    {
        public string Comment;
        public int Id { get; set; }
        public ApplicationUser TopicUser { get; set; }
        public DateTime Date;
        public string Header;
        public string Text;
        public ApplicationUser LoggedUser = null;
        public bool Signed = false;
        public ICollection<Comment> UserComments;
        public SignInManager<ApplicationUser> SignInManager;
        private UserManager<ApplicationUser> UserManager;
        ICommentsRepository commentsRepository;
        ITopicsRepository topicsRepository;
        public DetailsModel(
            ICommentsRepository commentsRepository,
            ITopicsRepository topicsRepository,
            SignInManager<ApplicationUser> SignInManager,
            UserManager<ApplicationUser> UserManager)
        {
            this.UserManager = UserManager;
            this.SignInManager = SignInManager;
            this.commentsRepository = commentsRepository;
            this.topicsRepository = topicsRepository;
        }
        public async Task<IActionResult> OnGetAsync(int Id)
        {
            if (SignInManager.IsSignedIn(User))
            {
                LoggedUser = await UserManager.GetUserAsync(User);
                Signed = true;
            }
            var Topic = await topicsRepository.GetTopicAsync(Id);
            if (Topic == null)
            {
                return NotFound();
            }
            TopicUser = Topic.User;
            Text = Topic.Text;
            Date = Topic.Date;
            Header = Topic.Header;
            UserComments = Topic.UserComments;
            this.Id = Topic.Id;
            return Page();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize]
        public async Task<IActionResult> OnPostAsync(string Comment, int Id)
        {
            var user = this.User.Identity;
            var LoggedUser = await UserManager.GetUserAsync(base.User);
            Guid guid = LoggedUser.Id;
            if (ModelState.IsValid && !string.IsNullOrWhiteSpace(Comment))
            {
                var comment = await commentsRepository.CreateCommentAsync(LoggedUser, Id, Comment);
                Comment = "";
                if (comment != null)
                    return await OnGetAsync(Id);
            }
            return RedirectToPage("Index");
        }
    }
}
