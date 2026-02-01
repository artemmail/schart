using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Moex.OptionCalc;

namespace StockChart.Repository.Services
{
    public sealed class MoexOptionCalcService : IMoexOptionCalcService
    {
        // Dedicated serializer options so enum values always follow MOEX wire format.
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            Converters =
            {
                new EnumMemberJsonConverterFactory(),
                new FlexibleBoolJsonConverter()
            }
        };

        private readonly HttpClient _httpClient;
        private readonly ILogger<MoexOptionCalcService> _logger;

        public MoexOptionCalcService(HttpClient httpClient, ILogger<MoexOptionCalcService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public Task<IReadOnlyList<AssetDto>> GetAssetsAsync(AssetType? assetType = null, AssetSubtype? assetSubtype = null, string? query = null, CancellationToken ct = default)
            => GetAsync<IReadOnlyList<AssetDto>>("assets", qb =>
            {
                qb.Add("asset_type", assetType);
                qb.Add("asset_subtype", assetSubtype);
                qb.Add("query", query);
            }, ct);

        public Task<AssetDto> GetAssetAsync(string assetCode, AssetType? assetType = null, CancellationToken ct = default)
            => GetAsync<AssetDto>($"assets/{Uri.EscapeDataString(assetCode)}", qb => qb.Add("asset_type", assetType), ct);

        public Task<IReadOnlyList<FuturesDto>> GetFuturesAsync(string assetCode, DateOnly? expirationDate = null, CancellationToken ct = default)
            => GetAsync<IReadOnlyList<FuturesDto>>($"assets/{Uri.EscapeDataString(assetCode)}/futures", qb =>
            {
                qb.Add("expiration_date", expirationDate);
            }, ct);

        public Task<IReadOnlyList<OptionDto>> GetOptionsAsync(
            string assetCode,
            AssetType? assetType = null,
            DateOnly? expirationDate = null,
            OptionSeriesType? seriesType = null,
            decimal? strike = null,
            OptionType? optionType = null,
            CancellationToken ct = default)
            => GetAsync<IReadOnlyList<OptionDto>>($"assets/{Uri.EscapeDataString(assetCode)}/options", qb =>
            {
                qb.Add("asset_type", assetType);
                qb.Add("expiration_date", expirationDate);
                qb.Add("series_type", seriesType);
                qb.Add("strike", strike);
                qb.Add("option_type", optionType);
            }, ct);

        public Task<OptionBriefDto> GetOptionBriefAsync(
            string assetCode,
            string secid,
            AssetType? assetType = null,
            int? daysUntilExpiring = null,
            decimal? underlyingPrice = null,
            decimal? volatility = null,
            CancellationToken ct = default)
            => GetAsync<OptionBriefDto>($"assets/{Uri.EscapeDataString(assetCode)}/options/{Uri.EscapeDataString(secid)}", qb =>
            {
                // The API can recalculate greeks/price with what-if parameters.
                qb.Add("asset_type", assetType);
                qb.Add("days_until_expiring", daysUntilExpiring);
                qb.Add("underlying_price", underlyingPrice);
                qb.Add("volatility", volatility);
            }, ct);

        public Task<IReadOnlyList<OptionSeriesDto>> GetOptionSeriesAsync(string assetCode, AssetType? assetType = null, CancellationToken ct = default)
            => GetAsync<IReadOnlyList<OptionSeriesDto>>($"assets/{Uri.EscapeDataString(assetCode)}/optionseries", qb => qb.Add("asset_type", assetType), ct);

        public Task<OptionSeriesDto> GetOptionSeriesAsync(string assetCode, string optionSeriesCode, AssetType? assetType = null, CancellationToken ct = default)
            => GetAsync<OptionSeriesDto>($"assets/{Uri.EscapeDataString(assetCode)}/optionseries/{Uri.EscapeDataString(optionSeriesCode)}", qb => qb.Add("asset_type", assetType), ct);

        public Task<IReadOnlyList<OptionDto>> GetOptionsInSeriesAsync(
            string assetCode,
            string optionSeriesCode,
            AssetType? assetType = null,
            int? strike = null,
            OptionType? optionType = null,
            CancellationToken ct = default)
            => GetAsync<IReadOnlyList<OptionDto>>($"assets/{Uri.EscapeDataString(assetCode)}/optionseries/{Uri.EscapeDataString(optionSeriesCode)}/options", qb =>
            {
                qb.Add("asset_type", assetType);
                qb.Add("strike", strike);
                qb.Add("option_type", optionType);
            }, ct);

        public Task<OptionBoardDto> GetOptionBoardAsync(string assetCode, string optionSeriesCode, AssetType? assetType = null, int? rows = null, CancellationToken ct = default)
            => GetAsync<OptionBoardDto>($"assets/{Uri.EscapeDataString(assetCode)}/optionseries/{Uri.EscapeDataString(optionSeriesCode)}/optionboard", qb =>
            {
                qb.Add("asset_type", assetType);
                qb.Add("rows", rows);
            }, ct);

        public Task<IReadOnlyList<VolatilityGraphPointDto>> GetVolatilityGraphAsync(string assetCode, string optionSeriesCode, AssetType? assetType = null, CancellationToken ct = default)
            => GetAsync<IReadOnlyList<VolatilityGraphPointDto>>($"assets/{Uri.EscapeDataString(assetCode)}/optionseries/{Uri.EscapeDataString(optionSeriesCode)}/volatility_graph", qb =>
            {
                qb.Add("asset_type", assetType);
            }, ct);

        public Task<CalculatedPortfolioDto> CalculatePortfolioAsync(OptionPortfolioRequestDto portfolio, CancellationToken ct = default)
            => PostAsync<CalculatedPortfolioDto>("portfolio/", portfolio, ct);

        public Task<IndicatorGraphDto> GetPortfolioGraphAsync(IndicatorType indicator, OptionPortfolioRequestDto portfolio, CancellationToken ct = default)
            => PostAsync<IndicatorGraphDto>($"portfolio/graph/{GetIndicatorSegment(indicator)}", portfolio, ct);

        public async Task<decimal> CalculateInitialMarginAsync(IReadOnlyList<InitialMarginPositionDto> positions, CancellationToken ct = default)
        {
            // The API returns a plain JSON number, not an object.
            using var request = new HttpRequestMessage(HttpMethod.Post, "portfolio/initial_margin")
            {
                Content = JsonContent.Create(positions, options: JsonOptions)
            };

            using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            await EnsureSuccessAsync(response, ct);

            var payload = await response.Content.ReadAsStringAsync(ct);
            if (string.IsNullOrWhiteSpace(payload))
            {
                throw new MoexOptionCalcException(response.StatusCode, "Empty JSON response.");
            }

            if (!decimal.TryParse(payload, NumberStyles.Any, CultureInfo.InvariantCulture, out var value))
            {
                throw new MoexOptionCalcException(response.StatusCode, $"Invalid number payload: {payload}");
            }

            return value;
        }

        private static string GetIndicatorSegment(IndicatorType indicator)
        {
            return indicator switch
            {
                IndicatorType.ProfitAndLoss => "profit_and_loss",
                IndicatorType.Delta => "delta",
                IndicatorType.Gamma => "gamma",
                IndicatorType.Vega => "vega",
                IndicatorType.Theta => "theta",
                IndicatorType.Rho => "rho",
                _ => throw new ArgumentOutOfRangeException(nameof(indicator), indicator, "Unknown indicator type.")
            };
        }

        private async Task<T> GetAsync<T>(string path, Action<QueryBuilder>? buildQuery, CancellationToken ct)
        {
            var qb = new QueryBuilder();
            buildQuery?.Invoke(qb);

            var url = qb.HasAny ? $"{path}?{qb}" : path;

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);

            await EnsureSuccessAsync(response, ct);

            var data = await response.Content.ReadFromJsonAsync<T>(JsonOptions, ct);
            if (data == null)
            {
                throw new MoexOptionCalcException(response.StatusCode, "Empty JSON response.");
            }

            return data;
        }

        private async Task<T> PostAsync<T>(string path, object body, CancellationToken ct)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, path)
            {
                Content = JsonContent.Create(body, options: JsonOptions)
            };

            using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            await EnsureSuccessAsync(response, ct);

            var data = await response.Content.ReadFromJsonAsync<T>(JsonOptions, ct);
            if (data == null)
            {
                throw new MoexOptionCalcException(response.StatusCode, "Empty JSON response.");
            }

            return data;
        }

        private async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken ct)
        {
            if (response.IsSuccessStatusCode)
            {
                return;
            }

            var body = await response.Content.ReadAsStringAsync(ct);

            // Common errors: 404 (not found), 422 (validation).
            _logger.LogWarning("MOEX option-calc API error: {Status} {Body}", (int)response.StatusCode, body);

            throw new MoexOptionCalcException(response.StatusCode, body);
        }

        private sealed class QueryBuilder
        {
            private readonly List<string> _items = new();
            public bool HasAny => _items.Count > 0;

            public void Add(string name, string? value)
            {
                if (string.IsNullOrWhiteSpace(value))
                {
                    return;
                }

                _items.Add($"{Uri.EscapeDataString(name)}={Uri.EscapeDataString(value)}");
            }

            public void Add(string name, int? value)
            {
                if (!value.HasValue)
                {
                    return;
                }

                _items.Add($"{Uri.EscapeDataString(name)}={value.Value}");
            }

            public void Add(string name, decimal? value)
            {
                if (!value.HasValue)
                {
                    return;
                }

                _items.Add($"{Uri.EscapeDataString(name)}={value.Value.ToString(CultureInfo.InvariantCulture)}");
            }

            public void Add(string name, bool? value)
            {
                if (!value.HasValue)
                {
                    return;
                }

                _items.Add($"{Uri.EscapeDataString(name)}={(value.Value ? "true" : "false")}");
            }

            public void Add(string name, DateOnly? value)
            {
                if (!value.HasValue)
                {
                    return;
                }

                _items.Add($"{Uri.EscapeDataString(name)}={value.Value:yyyy-MM-dd}");
            }

            public void Add<TEnum>(string name, TEnum? value) where TEnum : struct, Enum
            {
                if (!value.HasValue)
                {
                    return;
                }

                var wire = EnumMemberValueResolver.GetWireValue(value.Value);
                _items.Add($"{Uri.EscapeDataString(name)}={Uri.EscapeDataString(wire)}");
            }

            public override string ToString() => string.Join("&", _items);
        }
    }
}
