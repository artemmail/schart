using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.Serialization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace StockChart.Repository.Moex.OptionCalc
{
    /// <summary>
    /// JSON converter factory that serializes enums using EnumMemberAttribute values.
    /// </summary>
    public sealed class EnumMemberJsonConverterFactory : JsonConverterFactory
    {
        public override bool CanConvert(Type typeToConvert) => typeToConvert.IsEnum;

        public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
        {
            var converterType = typeof(EnumMemberJsonConverter<>).MakeGenericType(typeToConvert);
            return (JsonConverter)Activator.CreateInstance(converterType)!;
        }

        private sealed class EnumMemberJsonConverter<TEnum> : JsonConverter<TEnum> where TEnum : struct, Enum
        {
            public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                if (reader.TokenType == JsonTokenType.String)
                {
                    var raw = reader.GetString();
                    if (EnumMemberValueResolver.TryParse(raw, out TEnum value))
                    {
                        return value;
                    }
                }

                if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out var intValue))
                {
                    if (Enum.IsDefined(typeof(TEnum), intValue))
                    {
                        return (TEnum)Enum.ToObject(typeof(TEnum), intValue);
                    }
                }

                throw new JsonException($"Unable to convert JSON value to {typeof(TEnum).Name}.");
            }

            public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
            {
                writer.WriteStringValue(EnumMemberValueResolver.GetWireValue(value));
            }
        }
    }

    internal static class EnumMemberValueResolver
    {
        public static string GetWireValue<TEnum>(TEnum value) where TEnum : struct, Enum
        {
            return EnumMemberCache<TEnum>.ToString.TryGetValue(value, out var wire)
                ? wire
                : value.ToString();
        }

        public static bool TryParse<TEnum>(string? value, out TEnum result) where TEnum : struct, Enum
        {
            result = default;
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            if (EnumMemberCache<TEnum>.FromString.TryGetValue(value, out result))
            {
                return true;
            }

            return Enum.TryParse(value, ignoreCase: true, out result);
        }

        private static class EnumMemberCache<TEnum> where TEnum : struct, Enum
        {
            internal static readonly Dictionary<string, TEnum> FromString = BuildFromString();
            internal static readonly Dictionary<TEnum, string> ToString = BuildToString();

            private static Dictionary<string, TEnum> BuildFromString()
            {
                var map = new Dictionary<string, TEnum>(StringComparer.OrdinalIgnoreCase);
                foreach (var value in Enum.GetValues<TEnum>())
                {
                    var name = value.ToString();
                    var member = typeof(TEnum).GetMember(name);
                    var wire = member.Length > 0 ? GetEnumMemberValue(member[0]) : name;
                    map[wire] = value;
                    map[name] = value;
                }

                return map;
            }

            private static Dictionary<TEnum, string> BuildToString()
            {
                var map = new Dictionary<TEnum, string>();
                foreach (var value in Enum.GetValues<TEnum>())
                {
                    var name = value.ToString();
                    var member = typeof(TEnum).GetMember(name);
                    var wire = member.Length > 0 ? GetEnumMemberValue(member[0]) : name;
                    map[value] = wire;
                }

                return map;
            }

            private static string GetEnumMemberValue(MemberInfo member)
            {
                var attr = member.GetCustomAttribute<EnumMemberAttribute>(inherit: false);
                return string.IsNullOrWhiteSpace(attr?.Value) ? member.Name : attr.Value!;
            }
        }
    }
}
