using System;
using System.Collections.Generic;
using System.Globalization;
using Newtonsoft.Json;

namespace StockChart.Model
{
    public sealed record ShareInfo(
        string Secid,
        string? Shortname,
        string? Isin,
        int? LotSize,
        int? Decimals,
        decimal? MinStep
    );

    public sealed record EmitentInfo(int? EmitentId, string? EmitentTitle, string? EmitentInn);

    public sealed record BondDetails(
        DateTime? MaturityDate,
        decimal? FaceValue,
        string? Currency,
        string? Isin,
        string? RegNumber,
        string? PrimaryBoardId);

    public sealed record MoexBondRow(
        string SecId,
        string? Shortname,
        string? Isin,
        string? RegNumber,
        EmitentInfo Emitent,
        string? PrimaryBoardId,
        DateTime? MaturityDate,
        decimal? FaceValue,
        string? Currency)
    {
        public bool HasDetails =>
            MaturityDate.HasValue || FaceValue.HasValue || !string.IsNullOrWhiteSpace(Currency);

        public MoexBondRow WithDetails(BondDetails details)
        {
            return new MoexBondRow(
                SecId,
                Shortname,
                string.IsNullOrWhiteSpace(Isin) ? details.Isin : Isin,
                string.IsNullOrWhiteSpace(RegNumber) ? details.RegNumber : RegNumber,
                Emitent,
                string.IsNullOrWhiteSpace(PrimaryBoardId) ? details.PrimaryBoardId : PrimaryBoardId,
                MaturityDate ?? details.MaturityDate,
                FaceValue ?? details.FaceValue,
                string.IsNullOrWhiteSpace(Currency) ? details.Currency : Currency);
        }
    }

    public sealed record MoexFutureRow(
        string SecId,
        string? Shortname,
        string? AssetCode,
        DateTime? ExpirationDate,
        int? LotSize,
        decimal? MinStep,
        decimal? StepPrice);

    public sealed record MoexOptionRow(
        string SecId,
        string? Shortname,
        string? AssetCode,
        string? OptionType,
        decimal? Strike,
        DateTime? ExpirationDate,
        int? LotSize,
        string? BoardId,
        decimal? TheorPrice,
        decimal? Volat,
        decimal? Last,
        decimal? Bid,
        decimal? Offer,
        long? VolToday,
        long? OpenPosition,
        decimal? UnderlyingPrice);

    public sealed record MoexDividendRow(DateTime Date, decimal Value);

    public sealed record MoexBondMarketRow(
        string SecId,
        string? BoardId,
        decimal? PricePct,
        decimal? YieldPct,
        decimal? DayChangePct,
        decimal? DayVolume,
        long? DayVolumeQty,
        decimal? AccruedInterest,
        DateTime? NextCouponDate,
        DateTime? OfferDate,
        decimal? CouponValue,
        int? CouponPeriodDays,
        decimal? CouponRate,
        string? CouponType,
        DateTime? PlacementDate,
        long? IssueSize,
        long? IssueSizePlaced,
        int? ListingLevel,
        bool? QualifiedOnly,
        string? TradingStatus,
        string? PriceUnit,
        string? CurrencyId);

    public sealed record MoexBondCouponRow(
        string SecId,
        int? Number,
        DateTime? CouponDate,
        decimal? CouponValue,
        decimal? CouponYieldPct,
        decimal? PercentOfPar,
        decimal? PercentOfMarket);

    public readonly record struct OpenPositionsImportData(
        DateTime TradeDate,
        long PhysicalLong,
        long PhysicalShort,
        long JuridicalLong,
        long JuridicalShort,
        long PhysicalLongDelta,
        long PhysicalShortDelta,
        long JuridicalLongDelta,
        long JuridicalShortDelta,
        int PhysicalLongCount,
        int PhysicalShortCount,
        int JuridicalLongCount,
        int JuridicalShortCount
    );

    public sealed class MoexEnvelope
    {
        [JsonProperty("openpositions")]
        public List<OpenPosRow>? Openpositions { get; set; }
    }

    public sealed class OpenPosRow
    {
        [JsonProperty("title")]
        public string? Title { get; set; }

        [JsonProperty("tradedate")]
        public string? TradeDate { get; set; }

        [JsonProperty("long_fiz")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long LongFiz { get; set; }

        [JsonProperty("short_fiz")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long ShortFiz { get; set; }

        [JsonProperty("long_jur")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long LongJur { get; set; }

        [JsonProperty("short_jur")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long ShortJur { get; set; }

        [JsonProperty("total")]
        [JsonConverter(typeof(FlexibleLongConverter))]
        public long Total { get; set; }
    }

    public sealed class FlexibleLongConverter : JsonConverter<long>
    {
        public override long ReadJson(JsonReader reader, Type objectType, long existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            if (reader.TokenType == JsonToken.Integer)
                return Convert.ToInt64(reader.Value, CultureInfo.InvariantCulture);

            if (reader.TokenType == JsonToken.Float)
            {
                var dec = Convert.ToDecimal(reader.Value, CultureInfo.InvariantCulture);
                return (long)Math.Round(dec, 0, MidpointRounding.AwayFromZero);
            }

            if (reader.TokenType == JsonToken.String)
            {
                var s = (string?)reader.Value ?? string.Empty;
                return ParseLong(s);
            }

            if (reader.TokenType == JsonToken.Null)
                return 0;

            return 0;
        }

        public override void WriteJson(JsonWriter writer, long value, JsonSerializer serializer)
            => writer.WriteValue(value);

        private static long ParseLong(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return 0;

            s = s.Trim()
                 .Replace(" ", string.Empty)
                 .Replace("\u00A0", string.Empty)
                 .Replace("\u202F", string.Empty)
                 .Replace(",", ".");

            if (long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l))
                return l;

            if (decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var dec))
                return (long)Math.Round(dec, 0, MidpointRounding.AwayFromZero);

            return 0;
        }
    }
}
