using System.ComponentModel;

namespace StockChart.Model.Payments
{
    public class PaymentModel
    {
        public int Id { get; set; }
        [DisplayName("Логин")]
        public string? UserName { get; set; }
        [DisplayName("Email")]
        public string? Email { get; set; }
        [DisplayName("Оплата")]
        public decimal PayAmount { get; set; }
        [DisplayName("Дата оплаты")]
        public DateTime PayDate { get; set; }
        [DisplayName("Оплачено до")]
        public DateTime ExpireDate { get; set; }
        [DisplayName("Сервис")]
        public int Service { get; set; }
    }

}
