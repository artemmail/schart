using StockChart.Model;
using static StockChart.Repository.Services.BillingRepository;
namespace StockChart.Repository.Services
{
    public interface IBillingRepository
    {
        public IEnumerable<Subscription> getRefealSubscriptions(ApplicationUser User, Guid? referalUser);
        public PaymentShow GetUserInfo2(ApplicationUser user);        
        public void recievePayment(string Id);
        public Bill getBill(Guid id);
        void ApplyPayment(Bill bill);
    }
}