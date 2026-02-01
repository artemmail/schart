using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace StockChart.Repository.Moex.OptionCalc
{
    /// <summary>
    /// Accepts true/false, 0/1, or string representations of booleans.
    /// </summary>
    public sealed class FlexibleBoolJsonConverter : JsonConverter<bool?>
    {
        public override bool? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.True:
                    return true;
                case JsonTokenType.False:
                    return false;
                case JsonTokenType.Null:
                    return null;
                case JsonTokenType.Number:
                    if (reader.TryGetInt64(out var numberValue))
                    {
                        return numberValue != 0;
                    }
                    if (reader.TryGetDouble(out var doubleValue))
                    {
                        return Math.Abs(doubleValue) > double.Epsilon;
                    }
                    break;
                case JsonTokenType.String:
                    var text = reader.GetString();
                    if (string.IsNullOrWhiteSpace(text))
                    {
                        return null;
                    }
                    if (bool.TryParse(text, out var boolValue))
                    {
                        return boolValue;
                    }
                    if (long.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var longValue))
                    {
                        return longValue != 0;
                    }
                    if (double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var floatValue))
                    {
                        return Math.Abs(floatValue) > double.Epsilon;
                    }
                    break;
            }

            throw new JsonException($"Unsupported boolean token: {reader.TokenType}.");
        }

        public override void Write(Utf8JsonWriter writer, bool? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                writer.WriteBooleanValue(value.Value);
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }
}
