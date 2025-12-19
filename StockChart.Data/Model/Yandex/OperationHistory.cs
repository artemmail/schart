using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Yoomoney.model
{

    public class CustomDateTimeConverter : JsonConverter<DateTime>
    {
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.String && DateTime.TryParse(reader.GetString(), null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime date))
            {
                return date;
            }
            return default;
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString("o"));
        }
    }

    public class OperationHistory
    {
        [JsonPropertyName("operation_id")]
        public string operation_id { get; set; }        // Уникальный идентификатор операции

        [JsonPropertyName("status")]
        public string status { get; set; }             // Статус операции (например, "completed", "pending")

        [JsonPropertyName("type")]
        public string type { get; set; }               // Тип операции: "deposition" или "payment"

        [JsonPropertyName("amount")]
        public decimal amount { get; set; }            // Сумма операции

        [JsonPropertyName("datetime")]
       
        public DateTime datetime { get; set; }

        [JsonPropertyName("label")]
        public string label { get; set; }              // Метка операции, если указана

        [JsonPropertyName("title")]
        public string title { get; set; }              // Краткое описание операции

        [JsonPropertyName("direction")]
        public string direction { get; set; }          // Направление операции: "in" или "out"

        [JsonPropertyName("description")]
        public string description { get; set; }        // Описание или заметка к операции, если присутствует

        [JsonPropertyName("group_id")]
        public string group_id { get; set; }            // Группа операции

        [JsonPropertyName("pattern_id")]
        public string pattern_id { get; set; }          // Идентификатор шаблона, если присутствует

        [JsonPropertyName("amount_currency")]
        public string amount_currency { get; set; }     // Валюта суммы операции

        [JsonPropertyName("is_sbp_operation")]
        public bool is_sbp_operation { get; set; }       // Флаг для операций СБП

        [JsonPropertyName("spendingCategories")]
        public List<SpendingCategory> spendingCategories { get; set; } // Категории расходов
    }

    public class SpendingCategory
    {
        [JsonPropertyName("name")]
        public string Name { get; set; }               // Имя категории расходов

        [JsonPropertyName("sum")]
        public decimal Sum { get; set; }               // Сумма по категории расходов
    }

    public class OperationHistoryResponse
    {
        [JsonPropertyName("next_record")]
        public string NextRecord { get; set; }         // Следующий идентификатор записи, если есть

        [JsonPropertyName("operations")]
        public List<OperationHistory> Operations { get; set; } // Список операций
    }

}