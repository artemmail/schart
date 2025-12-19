using Newtonsoft.Json;

namespace StockChart.Model
{
    public class OpenPosition
    {
        [JsonProperty("id")]
        public int Id { get; set; }  // Идентификатор записи

        [JsonProperty("date")]
        public DateTime Date { get; set; }  // Дата контракта

        // Значения за день
        [JsonProperty("juridicalLong")]
        public long JuridicalLong { get; set; }  // Юридические лица - длинные позиции

        [JsonProperty("juridicalShort")]
        public long JuridicalShort { get; set; }  // Юридические лица - короткие позиции

        [JsonProperty("physicalLong")]
        public long PhysicalLong { get; set; }  // Физические лица - длинные позиции

        [JsonProperty("physicalShort")]
        public long PhysicalShort { get; set; }  // Физические лица - короткие позиции

        // Дельта изменений по сравнению с предыдущим днём
        [JsonProperty("juridicalLongDelta")]
        public long JuridicalLongDelta { get; set; }  // Дельта длинных позиций юрлиц

        [JsonProperty("juridicalShortDelta")]
        public long JuridicalShortDelta { get; set; }  // Дельта коротких позиций юрлиц

        [JsonProperty("physicalLongDelta")]
        public long PhysicalLongDelta { get; set; }  // Дельта длинных позиций физлиц

        [JsonProperty("physicalShortDelta")]
        public long PhysicalShortDelta { get; set; }  // Дельта коротких позиций физлиц

        // Количество юридических и физических лиц для длинных и коротких позиций
        [JsonProperty("juridicalLongCount")]
        public int JuridicalLongCount { get; set; }  // Количество юридических лиц для длинных позиций

        [JsonProperty("juridicalShortCount")]
        public int JuridicalShortCount { get; set; }  // Количество юридических лиц для коротких позиций

        [JsonProperty("physicalLongCount")]
        public int PhysicalLongCount { get; set; }  // Количество физических лиц для длинных позиций

        [JsonProperty("physicalShortCount")]
        public int PhysicalShortCount { get; set; }  // Количество физических лиц для коротких позиций

        [JsonProperty("contractName")]
        public string ContractName { get; set; }  // Название контракта
    }
}
