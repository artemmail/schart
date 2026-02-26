using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Options;
using System.Net.Mail;
using System.Text;

namespace StockChart.Hubs
{
    public class EmailSender : IEmailSender
    {
        private readonly SmtpOptions _smtpOptions;
        private readonly ILogger<EmailSender> _logger;

        public EmailSender(IOptions<SmtpOptions> smtpOptions, ILogger<EmailSender> logger)
        {
            _smtpOptions = smtpOptions.Value;
            _logger = logger;
        }

        public async Task SendEmailAsync(string email, string subject, string message1)
        {
            if (string.IsNullOrWhiteSpace(_smtpOptions.UserName) || string.IsNullOrWhiteSpace(_smtpOptions.Password))
            {
                throw new InvalidOperationException("SMTP credentials are not configured. Set Smtp:UserName and Smtp:Password.");
            }

            var fromEmail = string.IsNullOrWhiteSpace(_smtpOptions.FromEmail)
                ? _smtpOptions.UserName
                : _smtpOptions.FromEmail;
            var fromName = string.IsNullOrWhiteSpace(_smtpOptions.FromName)
                ? fromEmail
                : _smtpOptions.FromName;

            var fromAddress = new MailAddress(fromEmail, fromName);
            var toAddress = new MailAddress(email);

            var mailMessage = new MailMessage(fromAddress, toAddress)
            {
                Subject = subject,
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8,
                Body = message1
            };

            using var smtpClient = new SmtpClient(_smtpOptions.Host)
            {
                Port = _smtpOptions.Port,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new System.Net.NetworkCredential(_smtpOptions.UserName, _smtpOptions.Password),
                EnableSsl = _smtpOptions.EnableSsl
            };

            try
            {
                await smtpClient.SendMailAsync(mailMessage);
            }
            catch (SmtpException ex)
            {
                _logger.LogError(ex, "SMTP send failed for recipient {Recipient}", email);
                throw;
            }
        }
    }
}
