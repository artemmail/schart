using System.Text.Json.Serialization;

namespace StockChart.Model
{
    public class FinancialStatementEntryDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("year")]
        public string Year { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public string? Value { get; set; }
    }
}
