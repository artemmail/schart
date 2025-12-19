using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using StockChart.Model;
using StockChart.Model.Settings;
using System.Text;
using System.Text.Encodings.Web;
using StockChart.Areas.Identity.Pages.Account;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace YourNamespace.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IEmailSender _emailSender;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<AuthController> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly StockProcContext _db;

        public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager,
            ILogger<AuthController> logger, StockProcContext db, IHttpContextAccessor httpContextAccessor, IEmailSender emailSender)
        {
            _emailSender = emailSender;
            _signInManager = signInManager;
            _userManager = userManager;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _db = db;
        }

        [HttpGet("issignedin")]
        public IActionResult IsSignedIn() => Ok(_signInManager.IsSignedIn(User));

        [HttpGet("loggeduser")]
        [Authorize]
        public async Task<IActionResult> GetLoggedUser()
        {
            var user = await _userManager.GetUserAsync(User);
            return Ok(new { user.Id, user.UserName });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel.InputModel model)
        {
            if (!ModelState.IsValid) return BadRequest(TransformModelState(ModelState));

            var result = await _signInManager.PasswordSignInAsync(model.UserName, model.Password, model.RememberMe, false);
            if (result.Succeeded)
            {
                _logger.LogInformation("User logged in.");

                var user = await _userManager.FindByNameAsync(model.UserName);
                var roles = await _userManager.GetRolesAsync(user); // Получение ролей пользователя

                UserLoginHistory u = new UserLoginHistory()
                {
                    IpAddress = _httpContextAccessor.HttpContext.Connection.RemoteIpAddress.ToString(),
                    UserId = user.Id,
                    LoginTime = DateTime.Now,
                    UserAgent = _httpContextAccessor.HttpContext.Request.Headers["User-Agent"].ToString()??"none",
                    Location = ""
                };

                _db.Add(u);
                _db.SaveChanges();

                return Ok(new { message = "Login successful", roles }); // Возврат ролей в ответе
            }

            if (result.RequiresTwoFactor)
            {
                return BadRequest(new { message = "Requires two-factor authentication" });
            }
            if (result.IsLockedOut)
            {
                _logger.LogWarning("User account locked out.");
                return BadRequest(new { message = "User account locked out" });
            }
            else
            {
                return BadRequest(new { message = "Invalid login attempt" });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            _logger.LogInformation("User logged out.");
            return Ok(new { message = "Logout successful" });
        }


        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel.InputModel model)
        {
            if (ModelState.IsValid && model.Email.Count(x => x == '.') < 4)
            {
                var existingUser = await _userManager.FindByEmailAsync(model.Email);
                if (existingUser != null)
                {
                    return BadRequest(new { message = $"Найден пользователь {existingUser.UserName}" });
                }

                var user = new ApplicationUser { UserName = model.UserName, Email = model.Email };
                var result = await _userManager.CreateAsync(user, model.Password);

                if (result.Succeeded)
                {
                    _logger.LogInformation("User created a new account with password.");

                    var userId = await _userManager.GetUserIdAsync(user);
                    var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                    code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));

                    var callbackUrl = $"{Request.Scheme}://{Request.Host}/Identity/Account/ConfirmEmail?userId={userId}&code={code}";

                    await _emailSender.SendEmailAsync(model.Email, "Confirm your email",
                        $"Please confirm your account {model.UserName} by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");
                    return Ok(new { message = "Registration successful, please confirm your email." });
                }
                return BadRequest(result.Errors);
            }
            return BadRequest(TransformModelState(ModelState));
        }

        [HttpGet("confirmemail")]
        public async Task<IActionResult> ConfirmEmail(string userId, string code)
        {
            if (userId == null || code == null)
            {
                return BadRequest(new { message = "User ID and code are required." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = $"Unable to load user with ID '{userId}'." });
            }

            code = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(code));
            var result = await _userManager.ConfirmEmailAsync(user, code);

            if (result.Succeeded)
            {
                return Ok(new { message = "Thank you for confirming your email." });
            }
            else
            {
                return BadRequest(new { message = "Error confirming your email." });
            }
        }

        [HttpGet("confirmemailchange")]
        public async Task<IActionResult> ConfirmEmailChange(string userId, string email, string code)
        {
            if (userId == null || email == null || code == null)
            {
                return BadRequest(new { message = "User ID, email, and code are required." });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = $"User with ID '{userId}' not found." });
            }

            code = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(code));
            var result = await _userManager.ChangeEmailAsync(user, email, code);

            if (!result.Succeeded)
            {
                return BadRequest(new { message = "Error changing email." });
            }

            var setUserNameResult = await _userManager.SetUserNameAsync(user, email);
            if (!setUserNameResult.Succeeded)
            {
                return BadRequest(new { message = "Error changing user name." });
            }

            await _signInManager.RefreshSignInAsync(user);
            return Ok(new { message = "Thank you for confirming your email change." });
        }

        [HttpPost("forgotpassword")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordModel.InputModel model)
        {
            if (!ModelState.IsValid) return BadRequest(TransformModelState(ModelState));

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null || !(await _userManager.IsEmailConfirmedAsync(user)))
            {
                return BadRequest(new { message = "Email not found or not confirmed" });
            }

            var code = await _userManager.GeneratePasswordResetTokenAsync(user);
            code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));

            var callbackUrl = $"{Request.Scheme}://{Request.Host}/Identity/Account/ResetPassword?code={code}";

            await _emailSender.SendEmailAsync(
                model.Email,
                "Reset Password",
                $"Please reset your password by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");
            return Ok(new { message = "Password reset instructions have been sent to the email provided if it exists in our system." });
        }

        [HttpPost("resetpassword")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordModel.InputModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(TransformModelState(ModelState));
            }

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                return BadRequest(new { message = "Invalid email address" });
            }

            var code = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(model.Code));
            var result = await _userManager.ResetPasswordAsync(user, code, model.Password);
            if (result.Succeeded)
            {
                return Ok(new { message = "Password reset successful" });
            }

            return BadRequest(result.Errors);
        }

        [HttpPost("resend-email-confirmation")]
        public async Task<IActionResult> ResendEmailConfirmation([FromBody] ResendEmailConfirmationModel.InputModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(TransformModelState(ModelState));
            }

            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                return BadRequest(new { message = "Email not found" });
            }

            var userId = await _userManager.GetUserIdAsync(user);
            var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));

            var callbackUrl = $"{Request.Scheme}://{Request.Host}/Identity/Account/ConfirmEmail?userId={userId}&code={code}";

            await _emailSender.SendEmailAsync(
                model.Email,
                "Confirm your email",
                $"Please confirm your account by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");

            return Ok(new { message = "Verification email sent. Please check your email." });
        }

        private List<IdentityError> TransformModelState(ModelStateDictionary modelState)
        {
            return modelState.SelectMany(state => state.Value.Errors.Select(error => new IdentityError
            {
                Code = state.Key,
                Description = error.ErrorMessage
            })).ToList();
        }
    }
}
