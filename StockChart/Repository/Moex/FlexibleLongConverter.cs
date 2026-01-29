using Newtonsoft.Json;
using System.Globalization;

namespace StockChart.Repository.Moex
{
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
