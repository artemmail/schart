using Yoomoney.model;

namespace StockChart.Repository.Services
{
    public sealed class YooMoneyTokenResponse
    {
        public string? access_token { get; set; }
        public string? token_type { get; set; }
        public string? account { get; set; }
        public string? error { get; set; }
        public string? error_description { get; set; }

        public bool IsSuccess => !string.IsNullOrWhiteSpace(access_token);
    }

    public interface IYooMoneyRepository
    {
        public OperationDetails? operationDetails(string operationId);
        public List<OperationHistory>? operationHistory(int from, int count);
        public string authorize(string redirectUri, string? state = null);
        public Task<YooMoneyTokenResponse> tokenAsync(string code, string redirectUri, CancellationToken cancellationToken = default);
    }
}
