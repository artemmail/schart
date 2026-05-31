using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using StockChart.Repository;
using System.Text;
using System.Net.Http.Headers;
using Yoomoney.model;

namespace StockChart.Repository.Services
{
    public class YooMoneyRepository : IYooMoneyRepository
    {
        private const string Scope = "account-info operation-history operation-details";
        private static readonly HttpClient SharedHttpClient = new HttpClient();

        private readonly string _clientId;
        private readonly string _bearer;

        public YooMoneyRepository(IOptions<YooMoneyOptions> options)
        {
            var settings = options.Value;
            _clientId = settings.ClientId ?? throw new ArgumentNullException(nameof(settings.ClientId));
            _bearer = settings.Bearer ?? throw new ArgumentNullException(nameof(settings.Bearer));
        }

        public OperationDetails? operationDetails(string operationId)
        {
            var responseJson = request("api/operation-details", $"operation_id={operationId}");
            return JsonConvert.DeserializeObject<OperationDetails>(responseJson);
        }

        public List<OperationHistory>? operationHistory(int from, int count)
        {
            var responseJson = request("api/operation-history", $"records={count}&start_record={from}");
            var operationHistoryResponse = JsonConvert.DeserializeObject<OperationHistoryResponse>(responseJson);
            return operationHistoryResponse?.Operations;
        }

        public string authorize(string redirectUri, string? state = null)
        {
            var query = new List<string>
            {
                $"client_id={Uri.EscapeDataString(_clientId)}",
                "response_type=code",
                $"redirect_uri={Uri.EscapeDataString(redirectUri)}",
                $"scope={Uri.EscapeDataString(Scope)}"
            };

            if (!string.IsNullOrWhiteSpace(state))
            {
                query.Add($"state={Uri.EscapeDataString(state)}");
            }

            return $"https://yoomoney.ru/oauth/authorize?{string.Join("&", query)}";
        }

        public async Task<YooMoneyTokenResponse> tokenAsync(
            string code,
            string redirectUri,
            CancellationToken cancellationToken = default)
        {
            using var client = new HttpClient();
            using var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = _clientId,
                ["grant_type"] = "authorization_code",
                ["redirect_uri"] = redirectUri
            });

            using var response = await client.PostAsync(
                "https://yoomoney.ru/oauth/token",
                content,
                cancellationToken);

            var payload = await response.Content.ReadAsStringAsync(cancellationToken);
            var parsed = JsonConvert.DeserializeObject<YooMoneyTokenResponse>(payload)
                ?? new YooMoneyTokenResponse
                {
                    error = "invalid_response",
                    error_description = "Empty response from YooMoney token endpoint."
                };

            if (!response.IsSuccessStatusCode &&
                string.IsNullOrWhiteSpace(parsed.error))
            {
                parsed.error = $"http_{(int)response.StatusCode}";
                parsed.error_description = payload;
            }

            return parsed;
        }

        private string request(string function, string data, bool token = true)
        {
            var url = $"https://yoomoney.ru/{function}";
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(data, Encoding.UTF8, "application/x-www-form-urlencoded")
            };

            if (token)
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _bearer);
            }

            using var response = SharedHttpClient.Send(request);
            response.EnsureSuccessStatusCode();
            return response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        }
    }
}
