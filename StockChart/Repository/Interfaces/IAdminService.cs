namespace StockChart.Repository.Interfaces
{
    public class PaymentInfo
    {
        public decimal info { get; set; }
        public string comment { get; set; }
    }

    public class ProfitData
    {
        public DateTime date { get; set; }
        public decimal? profit { get; set; }
    }

    public class ReturnedUser
    {
        public string username { get; set; }
        public string Email { get; set; }
        public int cnt { get; set; }
        public decimal total { get; set; }
        public decimal min { get; set; }
        public decimal max { get; set; }
        public DateTime? lastdate { get; set; }
        public DateTime? expdate { get; set; }
    }

    public class PaymentDetails
    {
        public int Id { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public decimal PayAmount { get; set; }
        public DateTime PayDate { get; set; }
        public DateTime ExpireDate { get; set; }
        public int Service { get; set; }
    }

    public interface IAdminService
    {
        Task<IEnumerable<ProfitData>> GetProfitAsync();
        Task<IEnumerable<ProfitData>> GetProfitTotalAsync();
        Task<IEnumerable<ReturnedUser>> GetReturnedUsersAsync();
        Task<IEnumerable<PaymentInfo>> GetPaymentTableAsync();
        Task<IEnumerable<PaymentDetails>> GetTotalPaysAsync(string username);
        Task<IEnumerable<PaymentDetails>> GetActiveUsersAsync();
    }
}
