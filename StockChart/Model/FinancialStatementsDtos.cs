using System.Text.Json.Serialization;

namespace StockChart.Model
{
    public class FinancialStatementEntryDto
    {
        [JsonPropertyName("metricKey")]
        public string MetricKey { get; set; } = string.Empty;

        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [JsonPropertyName("isClickable")]
        public bool IsClickable { get; set; }

        [JsonPropertyName("valueType")]
        public string ValueType { get; set; } = "number";

        [JsonPropertyName("year")]
        public string Year { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public string? Value { get; set; }

        [JsonPropertyName("link")]
        public string? Link { get; set; }
    }
}
