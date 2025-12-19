using Microsoft.AspNetCore.Identity.UI.Services;
using System.Net.Mail;
using System.Text;

namespace StockChart.Hubs
{
    public class EmailSender : IEmailSender
    {
        public EmailSender()
        {

        }

        public async Task SendEmailAsync(string email, string subject, string message1)
        {
            var fromAddress = new MailAddress("ruticker@gmail.com", "Support StockChart.ru");
            var toAddress = new MailAddress(email);

            var mailMessage = new MailMessage(fromAddress, toAddress)
            {
                Subject = subject,
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8,
                Body = message1
            };

            using var smtpClient = new SmtpClient("smtp.gmail.com")
            {
                Port = 587,
                Credentials = new System.Net.NetworkCredential("artemmail@gmail.com", "wwix xirb kuey gsre"),
                EnableSsl = true
            };

            await smtpClient.SendMailAsync(mailMessage);
        }

    }
}
