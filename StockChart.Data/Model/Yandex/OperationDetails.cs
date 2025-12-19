using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Yoomoney.model
{
    public class OperationDetails
    {
        [JsonPropertyName("error")]
        public string error { get; set; }

        [JsonPropertyName("operation_id")]
        public string operation_id { get; set; }

        [JsonPropertyName("status")]
        public string status { get; set; }

        [JsonPropertyName("pattern_id")]
        public string pattern_id { get; set; }

        [JsonPropertyName("direction")]
        public string direction { get; set; }

        [JsonPropertyName("amount")]
        public decimal amount { get; set; }

        [JsonPropertyName("amount_due")]
        public decimal? amount_due { get; set; }

        [JsonPropertyName("fee")]
        public decimal? fee { get; set; }

        [JsonPropertyName("datetime")]
        public DateTime datetime { get; set; }

        [JsonPropertyName("title")]
        public string title { get; set; }

        [JsonPropertyName("sender")]
        public string sender { get; set; }

        [JsonPropertyName("recipient")]
        public string recipient { get; set; }

        [JsonPropertyName("recipient_type")]
        public string recipient_type { get; set; }

        [JsonPropertyName("message")]
        public string message { get; set; }

        [JsonPropertyName("comment")]
        public string comment { get; set; }

        [JsonPropertyName("label")]
        public string label { get; set; }

        [JsonPropertyName("details")]
        public string details { get; set; }

        [JsonPropertyName("type")]
        public string type { get; set; }

        [JsonPropertyName("digital_goods")]
        public DigitalGoods digital_goods { get; set; } // Данные о цифровом товаре (при наличии)
    }

    // Модель для поля digital_goods
    public class DigitalGoods
    {
        [JsonPropertyName("article")]
        public List<DigitalArticle> article { get; set; } // Список товаров

        [JsonPropertyName("bonus")]
        public List<DigitalBonus> bonus { get; set; } // Список бонусов
    }

    // Модель для каждого товара в digital_goods.article
    public class DigitalArticle
    {
        [JsonPropertyName("merchantArticleId")]
        public string merchantArticleId { get; set; } // Идентификатор товара в системе продавца

        [JsonPropertyName("serial")]
        public string serial { get; set; } // Серийный номер товара

        [JsonPropertyName("secret")]
        public string secret { get; set; } // Секретная часть цифрового товара
    }

    // Модель для каждого бонуса в digital_goods.bonus
    public class DigitalBonus
    {
        [JsonPropertyName("serial")]
        public string serial { get; set; } // Серийный номер бонуса

        [JsonPropertyName("secret")]
        public string secret { get; set; } // Секрет бонуса
    }
}
