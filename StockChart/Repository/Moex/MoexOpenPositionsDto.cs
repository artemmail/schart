using Newtonsoft.Json;

namespace StockChart.Repository.Moex
{
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
}
