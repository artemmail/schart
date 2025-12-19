
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using System.Data;
using System.Net.Mail;
namespace StockChart.Pages
{
    public class SupportPageModel : PageModel
    {
        public SignInManager<ApplicationUser> SignInManager;
        private UserManager<ApplicationUser> UserManager;
        IImageStoreRepository _imageStoreRepository;
        public SupportPageModel(SignInManager<ApplicationUser> SignInManager, UserManager<ApplicationUser> UserManager, IImageStoreRepository imageStoreRepository)
        {
            _imageStoreRepository = imageStoreRepository;
            this.UserManager = UserManager;
            this.SignInManager = SignInManager;
        }
        public string MessageType { get; set; }
        public string Header { get; set; }
        public string Text { get; set; }
        public IFormFile UploadedFile { get; set; }
        public List<SelectListItem> MessageTypes { get; set; }
        [Authorize]
        public void OnGet()
        {
            Header = "Нет заголовка";
            ViewData["Title"] = "Отправить сообщение технической поддержке";
            string[] types =
                { "Второстепенная проблема",
                "Котировки не поступают",
                "Проблемы в мобильном приложении",
                "Ошибки в футпринте",
                "Вопросы по оплате",
                "Предложение по работе сайта",
                "Услуги разработчиков" };
            MessageTypes = (from t in types select new SelectListItem { Selected = false, Text = t, Value = t }).ToList();
            MessageTypes[0].Selected = true;
        }
        [Authorize]
        public async Task<IActionResult> OnPostAsync(string Header, string Text, string MessageType, IFormFile UploadedFile)
        {
            /*
            newsTable.Date = DateTime.Now;
            Guid guid = (Guid)Membership.GetUser().ProviderUserKey;
            newsTable.UserId = guid;           */
            /*
            if (!PaymentOperations.IsPayedUser)
                if ((new Regex("http").Matches(SupportMessage.Text).Count > 2) || (SupportMessage.Text.StartsWith("<a href")))
                {
                    Membership.DeleteUser(Membership.GetUser().UserName,true);
                    return new HttpStatusCodeResult(500);
                }*/
            var user = this.User.Identity;
            var LoggedUser = await UserManager.GetUserAsync(base.User);
            Text = await _imageStoreRepository.ConvertFromBlob(LoggedUser, Text);

            MailMessage mail = new MailMessage();
            SmtpClient SmtpServer = new SmtpClient("smtp.gmail.com");
            SmtpServer.Port = 587;
            SmtpServer.Credentials = new System.Net.NetworkCredential("artemmail@gmail.com", "wwix xirb kuey gsre");
            SmtpServer.EnableSsl = true;
            var message = new MailMessage("artemmail@gmail.com", "ruticker@gmail.com");
            // message.SubjectEncoding = Encoding.UTF8;
            message.Subject = string.Format("{1}({0})", Header, MessageType);
            message.IsBodyHtml = true;
            message.From = new MailAddress(LoggedUser.Email, LoggedUser.UserName);
            //MailAddressCollection reply = new MailAddressCollection();
            //reply.Add(new MailAddress(Membership.GetUser().Email, Membership.GetUser().UserName));
            message.ReplyToList.Add(new MailAddress(LoggedUser.Email, LoggedUser.UserName));
            message.Body = Text;
            message.Body += string.Format(@"<p>От пользователя: {0} Email: {1}</p>", LoggedUser.UserName, LoggedUser.Email);
            //  message.Body += string.Format("<a href='mailto:{2}<{0}>?Subject={1}' target='_top'>Ответить</a>", Membership.GetUser().Email, System.Web.HttpUtility.UrlEncode("RE:"+message.Subject), Membership.GetUser().UserName);
            if (UploadedFile != null)
                message.Attachments.Add(new Attachment(UploadedFile.OpenReadStream(), UploadedFile.FileName));
            SmtpServer.Send(message);
            return RedirectToPage("/Index");
        }
    }
}