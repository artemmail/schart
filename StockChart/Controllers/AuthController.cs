using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication;
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
using StockChart.Repository.Interfaces;
using System.Security.Claims;
using StockChart.Logging;

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
        private readonly ApplicationDbContext _db;
        private readonly IUsersRepository _usersRepository;

        public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager,
            ILogger<AuthController> logger, ApplicationDbContext db, IHttpContextAccessor httpContextAccessor, IEmailSender emailSender,
            IUsersRepository usersRepository)
        {
            _emailSender = emailSender;
            _signInManager = signInManager;
            _userManager = userManager;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _db = db;
            _usersRepository = usersRepository;
        }

        [HttpGet("issignedin")]
        public IActionResult IsSignedIn() => Ok(_signInManager.IsSignedIn(User));

        [HttpGet("loggeduser")]
        [Authorize]
        public async Task<IActionResult> GetLoggedUser()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User is not authenticated." });
            }

            var hasActiveSubscription = await _usersRepository.UserHasActiveSubscription(user);
            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");
            var roles = await _userManager.GetRolesAsync(user);
            return Ok(new { user.Id, user.UserName, hasActiveSubscription, isAdmin, roles });
        }

        [HttpGet("external-providers")]
        [AllowAnonymous]
        public async Task<IActionResult> GetExternalProviders()
        {
            var providers = (await _signInManager.GetExternalAuthenticationSchemesAsync())
                .Select(scheme => new
                {
                    name = scheme.Name,
                    displayName = scheme.DisplayName ?? scheme.Name
                });

            return Ok(providers);
        }

        [HttpGet("external-login/{provider}")]
        [AllowAnonymous]
        public async Task<IActionResult> ExternalLogin(string provider, [FromQuery] string? returnUrl = null)
        {
            var normalizedReturnUrl = NormalizeReturnUrl(returnUrl);
            if (!TryGetExternalProvider(provider, out var scheme))
            {
                return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, "Провайдер внешнего входа недоступен."));
            }

            var availableProviders = await _signInManager.GetExternalAuthenticationSchemesAsync();
            if (!availableProviders.Any(item => string.Equals(item.Name, scheme, StringComparison.OrdinalIgnoreCase)))
            {
                return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, "Внешний вход не настроен."));
            }

            var redirectUrl = Url.Action(nameof(ExternalLoginCallback), "Auth", new { returnUrl = normalizedReturnUrl });
            if (string.IsNullOrWhiteSpace(redirectUrl))
            {
                return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, "Не удалось подготовить внешний вход."));
            }

            var properties = _signInManager.ConfigureExternalAuthenticationProperties(scheme, redirectUrl);
            return Challenge(properties, scheme);
        }

        [HttpGet("external-callback")]
        [AllowAnonymous]
        public async Task<IActionResult> ExternalLoginCallback([FromQuery] string? returnUrl = null, [FromQuery] string? remoteError = null)
        {
            var normalizedReturnUrl = NormalizeReturnUrl(returnUrl);
            if (!string.IsNullOrWhiteSpace(remoteError))
            {
                return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, $"Ошибка внешнего входа: {remoteError}"));
            }

            var info = await _signInManager.GetExternalLoginInfoAsync();
            if (info == null)
            {
                return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, "Не удалось получить данные внешнего входа."));
            }

            var signInResult = await _signInManager.ExternalLoginSignInAsync(
                info.LoginProvider,
                info.ProviderKey,
                isPersistent: true,
                bypassTwoFactor: true);

            if (signInResult.Succeeded)
            {
                var existingUser = await _userManager.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
                if (existingUser != null)
                {
                    await RecordLoginAsync(existingUser);
                }

                return Redirect(BuildSpaCallbackRedirect(normalizedReturnUrl));
            }

            if (signInResult.IsLockedOut)
            {
                return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, "Учётная запись заблокирована."));
            }

            var email = info.Principal.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrWhiteSpace(email))
            {
                return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, "Провайдер не вернул email пользователя."));
            }

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    Email = email,
                    UserName = await BuildUniqueUserNameAsync(email),
                    EmailConfirmed = true
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, JoinErrors(createResult.Errors)));
                }
            }
            else if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, JoinErrors(updateResult.Errors)));
                }
            }

            var addLoginResult = await _userManager.AddLoginAsync(user, info);
            if (!addLoginResult.Succeeded &&
                !addLoginResult.Errors.Any(error => error.Code == "LoginAlreadyAssociated"))
            {
                return Redirect(BuildLoginErrorRedirect(normalizedReturnUrl, JoinErrors(addLoginResult.Errors)));
            }

            await _signInManager.SignInAsync(user, isPersistent: true, info.LoginProvider);
            await RecordLoginAsync(user);
            return Redirect(BuildSpaCallbackRedirect(normalizedReturnUrl));
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
                await _db.SaveChangesAsync();

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

                    try
                    {
                        await _emailSender.SendEmailAsync(model.Email, "Confirm your email",
                            $"Please confirm your account {model.UserName} by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Registration email send failed for user {UserId} and email {Email}. Confirming registration automatically.", userId, model.Email);
                        RegistrationFileLogger.WriteError(
                            $"Registration email send failed. UserId={userId}; UserName={model.UserName}; Email={model.Email}. Confirming registration automatically.",
                            ex);

                        user.EmailConfirmed = true;
                        var updateResult = await _userManager.UpdateAsync(user);
                        if (!updateResult.Succeeded)
                        {
                            var updateErrors = string.Join("; ", updateResult.Errors.Select(error => $"{error.Code}: {error.Description}"));
                            RegistrationFileLogger.WriteInfo($"Automatic registration confirmation failed. UserId={userId}; Email={model.Email}; Errors={updateErrors}");
                            return BadRequest(updateResult.Errors);
                        }

                        RegistrationFileLogger.WriteInfo($"Registration confirmed automatically. UserId={userId}; UserName={model.UserName}; Email={model.Email}");
                        return Ok(new { message = "Registration successful. Confirmation email was not sent, registration confirmed automatically." });
                    }

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

        private async Task RecordLoginAsync(ApplicationUser user)
        {
            var loginHistory = new UserLoginHistory
            {
                IpAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                UserId = user.Id,
                LoginTime = DateTime.Now,
                UserAgent = _httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString() ?? "none",
                Location = ""
            };

            _db.Add(loginHistory);
            await _db.SaveChangesAsync();
        }

        private bool TryGetExternalProvider(string provider, out string scheme)
        {
            scheme = provider?.Trim().ToLowerInvariant() switch
            {
                "google" => "Google",
                "yandex" => "Yandex",
                _ => string.Empty
            };

            return !string.IsNullOrWhiteSpace(scheme);
        }

        private string NormalizeReturnUrl(string? returnUrl)
        {
            if (string.IsNullOrWhiteSpace(returnUrl))
            {
                return "/";
            }

            if (Url.IsLocalUrl(returnUrl))
            {
                return returnUrl;
            }

            if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var absoluteUrl))
            {
                var currentHost = Request.Host.Host;
                if (!string.IsNullOrWhiteSpace(currentHost) &&
                    string.Equals(absoluteUrl.Host, currentHost, StringComparison.OrdinalIgnoreCase))
                {
                    var localUrl = absoluteUrl.PathAndQuery + absoluteUrl.Fragment;
                    return Url.IsLocalUrl(localUrl) ? localUrl : "/";
                }
            }

            return "/";
        }

        private string BuildSpaCallbackRedirect(string returnUrl)
        {
            return QueryHelpers.AddQueryString("/auth/callback", "returnUrl", returnUrl);
        }

        private string BuildLoginErrorRedirect(string returnUrl, string message)
        {
            return QueryHelpers.AddQueryString(
                "/Identity/Account/Login",
                new Dictionary<string, string?>
                {
                    ["returnUrl"] = returnUrl,
                    ["externalError"] = message
                });
        }

        private async Task<string> BuildUniqueUserNameAsync(string email)
        {
            if (await _userManager.FindByNameAsync(email) == null)
            {
                return email;
            }

            var baseUserName = email.Split('@')[0];
            if (string.IsNullOrWhiteSpace(baseUserName))
            {
                baseUserName = "user";
            }

            var candidate = baseUserName;
            var suffix = 1;
            while (await _userManager.FindByNameAsync(candidate) != null)
            {
                candidate = $"{baseUserName}_{suffix++}";
            }

            return candidate;
        }

        private static string JoinErrors(IEnumerable<IdentityError> errors)
        {
            var message = string.Join(" ", errors
                .Select(error => error.Description)
                .Where(description => !string.IsNullOrWhiteSpace(description)));

            return string.IsNullOrWhiteSpace(message)
                ? "Не удалось выполнить операцию внешнего входа."
                : message;
        }
    }
}
