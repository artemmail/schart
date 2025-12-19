using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository;

namespace StockChart.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommentsController : ControllerBase
    {
        private readonly ICommentsRepository _commentsRepository;
        private readonly UserManager<ApplicationUser> _userManager;

        public CommentsController(ICommentsRepository commentsRepository, UserManager<ApplicationUser> userManager)
        {
            _commentsRepository = commentsRepository;
            _userManager = userManager;
        }

        [HttpPost("{topicId}/comments")]
        [Authorize]
        public async Task<IActionResult> AddComment(int topicId, [FromBody] CommentTextModel model)
        {
            if (ModelState.IsValid && !string.IsNullOrWhiteSpace(model.Text))
            {
                var loggedUser = await _userManager.GetUserAsync(User);
                var comment = await _commentsRepository.CreateCommentAsync(loggedUser, topicId, model.Text);
                if (comment != null)
                {
                    return CreatedAtAction(nameof(GetComment), new { id = comment.Id }, new { comment.Text, comment.Id, comment.Date, Author = comment.User.UserName });
                }
            }

            return BadRequest();
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> EditComment(int id, [FromBody] CommentTextModel model)
        {
            try
            {
                if (ModelState.IsValid && !string.IsNullOrWhiteSpace(model.Text))
                {
                    var loggedUser = await _userManager.GetUserAsync(User);
                    var comment = await _commentsRepository.UpdateCommentAsync(loggedUser, id, model.Text);
                    if (comment != null)
                    {
                        return Ok(new { comment.Text, comment.Id, comment.Date, Author = comment.User.UserName, TopicId = comment.TopicId });
                    }
                }
                return BadRequest("Bad model");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteComment(int id)
        {
            try
            {
                var loggedUser = await _userManager.GetUserAsync(User);
                await _commentsRepository.DeleteCommentAsync(loggedUser, id);

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Assuming you have a method to get a specific comment by its id for the CreatedAtAction
        [HttpGet("{id}")]
        public async Task<IActionResult> GetComment(int id)
        {
            var comment = await _commentsRepository.GetCommentAsync(id);
            if (comment == null)
            {
                return NotFound();
            }
            return Ok(new { comment.Text, comment.Id, comment.Date, Author = comment.User.UserName, TopicId = comment.TopicId });
        }

        public class CommentTextModel
        {
            public string Text { get; set; }
        }
    }
}
