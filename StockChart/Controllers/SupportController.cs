using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using System.Net.Mail;
using System.Text;

namespace StockChart.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SupportController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IImageStoreRepository _imageStoreRepository;

        public SupportController(IImageStoreRepository imageStoreRepository, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager)
        {
            _imageStoreRepository = imageStoreRepository;
            _userManager = userManager;
            _signInManager = signInManager;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> PostAsync([FromForm] SupportFormModel model)
        {
            if (model == null)
            {
                return BadRequest("Model is null");
            }

            if (string.IsNullOrEmpty(model.Header) || string.IsNullOrEmpty(model.Text) || string.IsNullOrEmpty(model.MessageType))
            {
                return BadRequest("One or more required fields are missing");
            }

            var loggedUser = await _userManager.GetUserAsync(User);
            if (loggedUser == null)
            {
                return Unauthorized("User is not authenticated");
            }

            var emailBody = await _imageStoreRepository.ConvertFromBlob(loggedUser, model.Text);
            var mailMessage = CreateMailMessage(model, loggedUser, emailBody);

            using var smtpClient = new SmtpClient("smtp.gmail.com")
            {
                Port = 587,
                Credentials = new System.Net.NetworkCredential("artemmail@gmail.com", "wwix xirb kuey gsre"),
                EnableSsl = true
            };

            try
            {
                await smtpClient.SendMailAsync(mailMessage);
            }
            catch (SmtpException ex)
            {
                return StatusCode(500, $"Error sending email: {ex.Message}");
            }

            return Ok();
        }

        private MailMessage CreateMailMessage(SupportFormModel model, ApplicationUser loggedUser, string emailBody)
        {
            var fromAddress = new MailAddress(loggedUser.Email, loggedUser.UserName);
            var toAddress = new MailAddress("ruticker@gmail.com");

            var mailMessage = new MailMessage(fromAddress, toAddress)
            {
                Subject = $"{model.MessageType} ({model.Header})",
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8,
                Body = $"{emailBody}<p>От пользователя: {loggedUser.UserName} Email: {loggedUser.Email}</p>"
            };

            mailMessage.ReplyToList.Add(fromAddress);

            if (model.UploadedFile != null)
            {
                mailMessage.Attachments.Add(new Attachment(model.UploadedFile.OpenReadStream(), model.UploadedFile.FileName));
            }

            return mailMessage;
        }
    }

    public class SupportFormModel
    {
        public string MessageType { get; set; }
        public string Header { get; set; }
        public string Text { get; set; }
        public IFormFile? UploadedFile { get; set; }
    }
}
