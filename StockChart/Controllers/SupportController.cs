using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using StockChart.Hubs;
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
        private readonly SmtpOptions _smtpOptions;
        private readonly ILogger<SupportController> _logger;

        public SupportController(
            IImageStoreRepository imageStoreRepository,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IOptions<SmtpOptions> smtpOptions,
            ILogger<SupportController> logger)
        {
            _imageStoreRepository = imageStoreRepository;
            _userManager = userManager;
            _signInManager = signInManager;
            _smtpOptions = smtpOptions.Value;
            _logger = logger;
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

            if (string.IsNullOrWhiteSpace(_smtpOptions.UserName) || string.IsNullOrWhiteSpace(_smtpOptions.Password))
            {
                return StatusCode(500, "SMTP credentials are not configured.");
            }

            var emailBody = await _imageStoreRepository.ConvertFromBlob(loggedUser, model.Text);
            var mailMessage = CreateMailMessage(model, loggedUser, emailBody);

            using var smtpClient = new SmtpClient(_smtpOptions.Host)
            {
                Port = _smtpOptions.Port,
                Credentials = new System.Net.NetworkCredential(_smtpOptions.UserName, _smtpOptions.Password),
                EnableSsl = _smtpOptions.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            try
            {
                await smtpClient.SendMailAsync(mailMessage);
            }
            catch (SmtpException ex)
            {
                _logger.LogError(ex, "Error sending support email for user {UserId}", loggedUser.Id);
                return StatusCode(500, $"Error sending email: {ex.Message}");
            }

            return Ok();
        }

        private MailMessage CreateMailMessage(SupportFormModel model, ApplicationUser loggedUser, string emailBody)
        {
            var fromEmail = string.IsNullOrWhiteSpace(_smtpOptions.FromEmail)
                ? _smtpOptions.UserName
                : _smtpOptions.FromEmail;
            var fromName = string.IsNullOrWhiteSpace(_smtpOptions.FromName)
                ? fromEmail
                : _smtpOptions.FromName;

            var fromAddress = new MailAddress(fromEmail, fromName);
            var toAddress = new MailAddress("ruticker@gmail.com");

            var mailMessage = new MailMessage(fromAddress, toAddress)
            {
                Subject = $"{model.MessageType} ({model.Header})",
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8,
                Body = $"{emailBody}<p>От пользователя: {loggedUser.UserName} Email: {loggedUser.Email}</p>"
            };

            if (!string.IsNullOrWhiteSpace(loggedUser.Email))
            {
                mailMessage.ReplyToList.Add(new MailAddress(loggedUser.Email, loggedUser.UserName));
            }

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
