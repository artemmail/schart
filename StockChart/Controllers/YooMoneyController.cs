using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using StockChart.Repository.Services;
using System.Text;

namespace StockChart.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class YooMoneyController : ControllerBase
    {
        private readonly IYooMoneyRepository _yooMoneyRepository;
        private readonly YooMoneyTokenConfigStoreMain _tokenConfigStore;

        public YooMoneyController(
            IYooMoneyRepository yooMoneyRepository,
            YooMoneyTokenConfigStoreMain tokenConfigStore)
        {
            _yooMoneyRepository = yooMoneyRepository;
            _tokenConfigStore = tokenConfigStore;
        }

        [Admin]
        [HttpGet("operation-details/{operationId}")]
        public IActionResult GetOperationDetails(string operationId)
        {
            var details = _yooMoneyRepository.operationDetails(operationId);
            if (details == null)
            {
                return NotFound("Operation details not found.");
            }

            return Ok(details);
        }

        [Admin]
        [HttpGet("operation-history")]
        public IActionResult GetOperationHistory([FromQuery] int from, [FromQuery] int count)
        {
            var history = _yooMoneyRepository.operationHistory(from, count);
            if (history == null || !history.Any())
            {
                return NotFound("Operation history not found.");
            }

            return Ok(history);
        }

        [Admin]
        [HttpGet("authorize")]
        public IActionResult Authorize([FromQuery] string? returnUrl = null)
        {
            var normalizedReturnUrl = NormalizeReturnUrl(returnUrl);
            var callbackUrl = BuildCallbackUrl();
            var state = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(normalizedReturnUrl));
            var authorizationUrl = _yooMoneyRepository.authorize(callbackUrl, state);
            return Redirect(authorizationUrl);
        }

        [Admin]
        [HttpPost("token")]
        public async Task<IActionResult> ExchangeToken(
            [FromBody] YooMoneyTokenRequest request,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Code))
            {
                return BadRequest(new { message = "Authorization code is required." });
            }

            var tokenResponse = await _yooMoneyRepository.tokenAsync(
                request.Code,
                BuildCallbackUrl(),
                cancellationToken);

            if (!tokenResponse.IsSuccess || string.IsNullOrWhiteSpace(tokenResponse.access_token))
            {
                return BadRequest(tokenResponse);
            }

            await _tokenConfigStore.SaveBearerAsync(tokenResponse.access_token, cancellationToken);

            return Ok(new
            {
                accessToken = tokenResponse.access_token,
                account = tokenResponse.account,
                tokenType = tokenResponse.token_type
            });
        }

        [Admin]
        [HttpGet("oauth-callback")]
        public async Task<IActionResult> OAuthCallback(
            [FromQuery] string? code = null,
            [FromQuery] string? state = null,
            [FromQuery] string? error = null,
            [FromQuery] string? error_description = null,
            CancellationToken cancellationToken = default)
        {
            var returnUrl = DecodeReturnUrl(state);

            if (!string.IsNullOrWhiteSpace(error))
            {
                return Redirect(BuildErrorRedirect(returnUrl, error_description ?? error));
            }

            if (string.IsNullOrWhiteSpace(code))
            {
                return Redirect(BuildErrorRedirect(returnUrl, "YooMoney did not return an authorization code."));
            }

            var tokenResponse = await _yooMoneyRepository.tokenAsync(
                code,
                BuildCallbackUrl(),
                cancellationToken);

            if (!tokenResponse.IsSuccess || string.IsNullOrWhiteSpace(tokenResponse.access_token))
            {
                return Redirect(BuildErrorRedirect(
                    returnUrl,
                    tokenResponse.error_description ?? tokenResponse.error ?? "Failed to obtain YooMoney token."));
            }

            await _tokenConfigStore.SaveBearerAsync(tokenResponse.access_token, cancellationToken);

            return Redirect(BuildSuccessRedirect(returnUrl));
        }

        private string BuildCallbackUrl()
        {
            var callbackUrl = Url.ActionLink(
                nameof(OAuthCallback),
                "YooMoney",
                values: null,
                protocol: Request.Scheme);

            if (string.IsNullOrWhiteSpace(callbackUrl))
            {
                throw new InvalidOperationException("Failed to build YooMoney callback URL.");
            }

            return callbackUrl;
        }

        private static string NormalizeReturnUrl(string? returnUrl)
        {
            if (string.IsNullOrWhiteSpace(returnUrl))
            {
                return "/YooMoney";
            }

            if (!returnUrl.StartsWith("/", StringComparison.Ordinal) ||
                returnUrl.StartsWith("//", StringComparison.Ordinal))
            {
                return "/YooMoney";
            }

            return returnUrl;
        }

        private static string DecodeReturnUrl(string? state)
        {
            if (string.IsNullOrWhiteSpace(state))
            {
                return "/YooMoney";
            }

            try
            {
                var bytes = WebEncoders.Base64UrlDecode(state);
                var returnUrl = Encoding.UTF8.GetString(bytes);
                return NormalizeReturnUrl(returnUrl);
            }
            catch
            {
                return "/YooMoney";
            }
        }

        private static string BuildSuccessRedirect(string returnUrl)
        {
            if (string.Equals(returnUrl, "/YooMoney", StringComparison.OrdinalIgnoreCase))
            {
                return QueryHelpers.AddQueryString(returnUrl, "oauth", "success");
            }

            return returnUrl;
        }

        private static string BuildErrorRedirect(string returnUrl, string message)
        {
            return QueryHelpers.AddQueryString("/YooMoney", new Dictionary<string, string?>
            {
                ["oauth"] = "error",
                ["message"] = message,
                ["returnUrl"] = NormalizeReturnUrl(returnUrl)
            });
        }

        public sealed class YooMoneyTokenRequest
        {
            public string? Code { get; set; }
        }
    }
}
