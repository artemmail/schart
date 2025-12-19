using System.Text.Json.Serialization;

namespace StockChart.Model
{
    public class OpenPosition
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }  // Идентификатор записи

        [JsonPropertyName("date")]
        public DateTime Date { get; set; }  // Дата контракта

        // Значения за день
        [JsonPropertyName("juridicalLong")]
        public long JuridicalLong { get; set; }  // Юридические лица - длинные позиции

        [JsonPropertyName("juridicalShort")]
        public long JuridicalShort { get; set; }  // Юридические лица - короткие позиции

        [JsonPropertyName("physicalLong")]
        public long PhysicalLong { get; set; }  // Физические лица - длинные позиции

        [JsonPropertyName("physicalShort")]
        public long PhysicalShort { get; set; }  // Физические лица - короткие позиции

        // Дельта изменений по сравнению с предыдущим днём
        [JsonPropertyName("juridicalLongDelta")]
        public long JuridicalLongDelta { get; set; }  // Дельта длинных позиций юрлиц

        [JsonPropertyName("juridicalShortDelta")]
        public long JuridicalShortDelta { get; set; }  // Дельта коротких позиций юрлиц

        [JsonPropertyName("physicalLongDelta")]
        public long PhysicalLongDelta { get; set; }  // Дельта длинных позиций физлиц

        [JsonPropertyName("physicalShortDelta")]
        public long PhysicalShortDelta { get; set; }  // Дельта коротких позиций физлиц

        // Количество юридических и физических лиц для длинных и коротких позиций
        [JsonPropertyName("juridicalLongCount")]
        public int JuridicalLongCount { get; set; }  // Количество юридических лиц для длинных позиций

        [JsonPropertyName("juridicalShortCount")]
        public int JuridicalShortCount { get; set; }  // Количество юридических лиц для коротких позиций

        [JsonPropertyName("physicalLongCount")]
        public int PhysicalLongCount { get; set; }  // Количество физических лиц для длинных позиций

        [JsonPropertyName("physicalShortCount")]
        public int PhysicalShortCount { get; set; }  // Количество физических лиц для коротких позиций

        [JsonPropertyName("contractName")]
        public string ContractName { get; set; }  // Название контракта
    }
}
