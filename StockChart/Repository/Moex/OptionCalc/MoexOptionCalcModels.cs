using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace StockChart.Repository.Moex.OptionCalc
{
    // Enums are serialized as strings using EnumMemberAttribute values.
    [JsonConverter(typeof(EnumMemberJsonConverterFactory))]
    public enum AssetType
    {
        [EnumMember(Value = "commodity")] Commodity,
        [EnumMember(Value = "currency")] Currency,
        [EnumMember(Value = "futures")] Futures,
        [EnumMember(Value = "index")] Index,
        [EnumMember(Value = "share")] Share
    }

    [JsonConverter(typeof(EnumMemberJsonConverterFactory))]
    public enum AssetSubtype
    {
        [EnumMember(Value = "commodity")] Commodity,
        [EnumMember(Value = "currency")] Currency,
        [EnumMember(Value = "index")] Index,
        [EnumMember(Value = "share")] Share
    }

    [JsonConverter(typeof(EnumMemberJsonConverterFactory))]
    public enum OptionType
    {
        [EnumMember(Value = "call")] Call,
        [EnumMember(Value = "put")] Put
    }

    [JsonConverter(typeof(EnumMemberJsonConverterFactory))]
    public enum OptionSeriesType
    {
        [EnumMember(Value = "W")] W,
        [EnumMember(Value = "M")] M,
        [EnumMember(Value = "Q")] Q
    }

    [JsonConverter(typeof(EnumMemberJsonConverterFactory))]
    public enum SimulatedPositionType
    {
        [EnumMember(Value = "currency")] Currency,
        [EnumMember(Value = "commodity")] Commodity,
        [EnumMember(Value = "futures")] Futures,
        [EnumMember(Value = "option")] Option,
        [EnumMember(Value = "share")] Share
    }

    public enum IndicatorType
    {
        ProfitAndLoss,
        Delta,
        Gamma,
        Vega,
        Theta,
        Rho
    }

    public sealed class AssetDto
    {
        [JsonPropertyName("asset_code")] public string AssetCode { get; set; } = string.Empty;
        [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
        [JsonPropertyName("asset_type")] public AssetType AssetType { get; set; }
        [JsonPropertyName("asset_subtype")] public AssetSubtype? AssetSubtype { get; set; }
    }

    public sealed class FuturesDto
    {
        [JsonPropertyName("futures_code")] public string FuturesCode { get; set; } = string.Empty;
        [JsonPropertyName("asset_code")] public string AssetCode { get; set; } = string.Empty;
        [JsonPropertyName("asset_type")] public AssetType AssetType { get; set; }
        [JsonPropertyName("expiration_date")] public DateOnly ExpirationDate { get; set; }
    }

    public sealed class OptionDto
    {
        [JsonPropertyName("secid")] public string SecId { get; set; } = string.Empty;
        [JsonPropertyName("asset_code")] public string AssetCode { get; set; } = string.Empty;
        [JsonPropertyName("asset_type")] public AssetType AssetType { get; set; }
        [JsonPropertyName("futures_code")] public string? FuturesCode { get; set; }
        [JsonPropertyName("expiration_date")] public DateOnly ExpirationDate { get; set; }
        [JsonPropertyName("series_type")] public OptionSeriesType SeriesType { get; set; }
        [JsonPropertyName("strike")] public decimal Strike { get; set; }
        [JsonPropertyName("option_type")] public OptionType OptionType { get; set; }
    }

    public sealed class OptionBriefDto
    {
        [JsonPropertyName("delta")] public decimal Delta { get; set; }
        [JsonPropertyName("gamma")] public decimal Gamma { get; set; }
        [JsonPropertyName("vega")] public decimal Vega { get; set; }
        [JsonPropertyName("theta")] public decimal Theta { get; set; }
        [JsonPropertyName("rho")] public decimal Rho { get; set; }

        [JsonPropertyName("secid")] public string SecId { get; set; } = string.Empty;
        [JsonPropertyName("days_until_expiring")] public int DaysUntilExpiring { get; set; }

        [JsonPropertyName("underlying_price")] public decimal UnderlyingPrice { get; set; }
        [JsonPropertyName("volatility")] public decimal Volatility { get; set; }

        [JsonPropertyName("underlying_asset")] public string UnderlyingAsset { get; set; } = string.Empty;
        [JsonPropertyName("underlying_type")] public AssetType UnderlyingType { get; set; }

        [JsonPropertyName("theorprice")] public decimal TheorPrice { get; set; }
        [JsonPropertyName("fee")] public decimal Fee { get; set; }

        [JsonPropertyName("expiring_date")] public DateOnly ExpiringDate { get; set; }
        [JsonPropertyName("lastprice")] public decimal LastPrice { get; set; }
        [JsonPropertyName("settleprice")] public decimal SettlePrice { get; set; }
    }

    public sealed class OptionSeriesTotalsDto
    {
        [JsonPropertyName("volume_rub")] public decimal VolumeRub { get; set; }
        [JsonPropertyName("volume_contracts")] public int VolumeContracts { get; set; }
        [JsonPropertyName("openposition")] public int OpenPosition { get; set; }
        [JsonPropertyName("oichange")] public int OiChange { get; set; }
    }

    public sealed class OptionSeriesDto
    {
        [JsonPropertyName("optionseries_code")] public string OptionSeriesCode { get; set; } = string.Empty;
        [JsonPropertyName("asset_code")] public string AssetCode { get; set; } = string.Empty;
        [JsonPropertyName("asset_type")] public AssetType AssetType { get; set; }
        [JsonPropertyName("futures_code")] public string? FuturesCode { get; set; }
        [JsonPropertyName("series_type")] public OptionSeriesType SeriesType { get; set; }
        [JsonPropertyName("expiration_date")] public DateOnly ExpirationDate { get; set; }
        [JsonPropertyName("central_strike")] public decimal CentralStrike { get; set; }

        [JsonPropertyName("call")] public OptionSeriesTotalsDto? Call { get; set; }
        [JsonPropertyName("put")] public OptionSeriesTotalsDto? Put { get; set; }

        [JsonPropertyName("updatetime")] public DateTimeOffset? UpdateTime { get; set; }
    }

    public sealed class OptionBoardRowDto
    {
        [JsonPropertyName("secid")] public string SecId { get; set; } = string.Empty;
        [JsonPropertyName("strike")] public decimal Strike { get; set; }

        [JsonPropertyName("delta")] public decimal? Delta { get; set; }
        [JsonPropertyName("gamma")] public decimal? Gamma { get; set; }
        [JsonPropertyName("vega")] public decimal? Vega { get; set; }
        [JsonPropertyName("theta")] public decimal? Theta { get; set; }
        [JsonPropertyName("rho")] public decimal? Rho { get; set; }

        [JsonPropertyName("theorprice")] public decimal? TheorPrice { get; set; }
        [JsonPropertyName("theorprice_rub")] public decimal? TheorPriceRub { get; set; }

        [JsonPropertyName("last")] public decimal? Last { get; set; }
        [JsonPropertyName("offer")] public decimal? Offer { get; set; }
        [JsonPropertyName("bid")] public decimal? Bid { get; set; }

        [JsonPropertyName("numtrades")] public int? NumTrades { get; set; }

        [JsonPropertyName("volatility")] public decimal? Volatility { get; set; }
        [JsonPropertyName("intrinsic_value")] public decimal? IntrinsicValue { get; set; }
        [JsonPropertyName("timed_value")] public decimal? TimedValue { get; set; }
    }

    public sealed class OptionBoardDto
    {
        [JsonPropertyName("call")] public List<OptionBoardRowDto> Call { get; set; } = new();
        [JsonPropertyName("put")] public List<OptionBoardRowDto> Put { get; set; } = new();
    }

    public sealed class VolatilityGraphPointDto
    {
        [JsonPropertyName("strike")] public decimal Strike { get; set; }
        [JsonPropertyName("volatility")] public decimal Volatility { get; set; }
    }

    public sealed class WhatIfConditionDto
    {
        /// <summary>
        /// Delta to the implied volatility, in percentage points, applied to all options.
        /// Example: -10 means "IV minus 10 percentage points".
        /// </summary>
        [JsonPropertyName("delta_sigma")] public decimal? DeltaSigma { get; set; }

        /// <summary>
        /// Date of calculation for the what-if scenario (YYYY-MM-DD).
        /// </summary>
        [JsonPropertyName("date_of_calculation")] public DateOnly? DateOfCalculation { get; set; }
    }

    public sealed class SimulatedPositionDto
    {
        [JsonPropertyName("secid")] public string SecId { get; set; } = string.Empty;

        /// <summary>Instrument type: currency/share/futures/commodity/option.</summary>
        [JsonPropertyName("type")] public SimulatedPositionType Type { get; set; }

        /// <summary>Quantity: positive = buy, negative = sell.</summary>
        [JsonPropertyName("quantity")] public int Quantity { get; set; }

        /// <summary>Optional entry price in points.</summary>
        [JsonPropertyName("price")] public decimal? Price { get; set; }

        /// <summary>Optional override for implied volatility (in %).</summary>
        [JsonPropertyName("volatility")] public decimal? Volatility { get; set; }

        /// <summary>
        /// Initial margin netting flag. True = netted with the rest of the portfolio.
        /// </summary>
        [JsonPropertyName("netted_im")] public bool? NettedIm { get; set; } = true;
    }

    public sealed class OptionPortfolioRequestDto
    {
        [JsonPropertyName("asset_code")] public string AssetCode { get; set; } = string.Empty;
        [JsonPropertyName("asset_type")] public AssetType? AssetType { get; set; }
        [JsonPropertyName("positions")] public List<SimulatedPositionDto> Positions { get; set; } = new();
        [JsonPropertyName("what_if")] public WhatIfConditionDto? WhatIf { get; set; }
    }

    public sealed class CalculatedPositionDto
    {
        [JsonPropertyName("secid")] public string SecId { get; set; } = string.Empty;
        [JsonPropertyName("type")] public SimulatedPositionType Type { get; set; }
        [JsonPropertyName("quantity")] public int Quantity { get; set; }

        [JsonPropertyName("price")] public decimal? Price { get; set; }
        [JsonPropertyName("volatility")] public decimal? Volatility { get; set; }
        [JsonPropertyName("strike")] public decimal? Strike { get; set; }
        [JsonPropertyName("expiration_date")] public DateOnly? ExpirationDate { get; set; }
        [JsonPropertyName("days_until_expiring")] public int? DaysUntilExpiring { get; set; }

        [JsonPropertyName("delta")] public decimal Delta { get; set; }
        [JsonPropertyName("gamma")] public decimal Gamma { get; set; }
        [JsonPropertyName("vega")] public decimal Vega { get; set; }
        [JsonPropertyName("theta")] public decimal Theta { get; set; }
        [JsonPropertyName("rho")] public decimal Rho { get; set; }

        [JsonPropertyName("profit_and_loss")] public decimal? ProfitAndLoss { get; set; }
        [JsonPropertyName("profit_and_loss_rub")] public decimal? ProfitAndLossRub { get; set; }
        [JsonPropertyName("fee")] public decimal? Fee { get; set; }

        [JsonPropertyName("theorprice")] public decimal? TheorPrice { get; set; }
        [JsonPropertyName("expired")] public bool? Expired { get; set; }
    }

    public sealed class CalculatedTotalDto
    {
        [JsonPropertyName("delta")] public decimal Delta { get; set; }
        [JsonPropertyName("gamma")] public decimal Gamma { get; set; }
        [JsonPropertyName("vega")] public decimal Vega { get; set; }
        [JsonPropertyName("theta")] public decimal Theta { get; set; }
        [JsonPropertyName("rho")] public decimal Rho { get; set; }
        [JsonPropertyName("profit_and_loss")] public decimal? ProfitAndLoss { get; set; }
        [JsonPropertyName("profit_and_loss_rub")] public decimal? ProfitAndLossRub { get; set; }
        [JsonPropertyName("fee")] public decimal? Fee { get; set; }
    }

    public sealed class CalculatedPortfolioDto
    {
        [JsonPropertyName("positions")] public List<CalculatedPositionDto> Positions { get; set; } = new();
        [JsonPropertyName("total")] public CalculatedTotalDto Total { get; set; } = new();
        [JsonPropertyName("initial_margin")] public decimal? InitialMargin { get; set; }
    }

    public sealed class IndicatorGraphPointDto
    {
        [JsonPropertyName("underlying_price")] public decimal UnderlyingPrice { get; set; }
        [JsonPropertyName("value")] public decimal Value { get; set; }
    }

    public sealed class IndicatorGraphDto
    {
        [JsonPropertyName("now")] public List<IndicatorGraphPointDto> Now { get; set; } = new();
        [JsonPropertyName("on_expiration")] public List<IndicatorGraphPointDto> OnExpiration { get; set; } = new();
        [JsonPropertyName("on_what_if")] public List<IndicatorGraphPointDto>? OnWhatIf { get; set; }
    }

    public sealed class InitialMarginPositionDto
    {
        [JsonPropertyName("secid")] public string SecId { get; set; } = string.Empty;
        [JsonPropertyName("quantity")] public int Quantity { get; set; }
        [JsonPropertyName("price")] public decimal Price { get; set; }

        /// <summary>
        /// Initial margin netting flag. True = allow netting, false = worst-case.
        /// </summary>
        [JsonPropertyName("netted_im")] public bool? NettedIm { get; set; } = true;
    }
}
