using StockChart.Model;
using StockChart.Model.Payments;

namespace StockChart.Repository.Interfaces
{
    public interface IUsersRepository
    {
        public bool IsPayed(ApplicationUser user, int service);
        public Task<bool> UserHasActiveSubscription(ApplicationUser user);
        public bool IsPayed(ApplicationUser user, string ticker);
        public ApplicationUserModel UserToModel(ApplicationUser user);
        public void Destroy(IEnumerable<Guid> userIds);
        public IQueryable<ApplicationUser> GetAll();
    }
}