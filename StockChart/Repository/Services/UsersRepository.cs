


using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Model.Payments;
using StockChart.Repository.Interfaces;

namespace StockChart.Repository
{
    public class UsersRepository : IUsersRepository
    {
        private readonly StockProcContext _dbContext;
        private readonly IStockMarketServiceRepository _stockMarketServiceRepository;
        private readonly ITickersRepository _tickers;

        public UsersRepository(StockProcContext dbContext,
                               IStockMarketServiceRepository stockMarketServiceRepository,
                               ITickersRepository tickers)
        {
            _dbContext = dbContext;
            _stockMarketServiceRepository = stockMarketServiceRepository;
            _tickers = tickers;
        }


        public async Task<bool> UserHasActiveSubscription(ApplicationUser user)
        {
            if (user == null)
                return false;
            return await _dbContext.Payments.Where(x => x.UserId == user.Id && x.ExpireDate >= DateTime.Now).AnyAsync();
        }

        public bool IsPayed(ApplicationUser user, int service)
        {
            if (user == null)
                return false;
            return _dbContext.Payments.Where(x => x.UserId == user.Id && x.Service == service && x.ExpireDate >= DateTime.Now).Any();
        }

        public bool IsPayed(ApplicationUser user, string ticker)
        {
            string ts = ticker;
            _stockMarketServiceRepository.UpdateAlias(ref ts);

            if (ticker == "GAZP")// && DicCont.Instance.Tickers[ticker.ToUpper()].IsSupportedForUser(user) == false)
                return true;

            var market = _tickers[ts].Market;
            int service = 2;

            if (market < 10)
                service = 1;
            if (market == 20)
                service = 3;
            return IsPayed(user, service);
        }
        public ApplicationUserModel UserToModel(ApplicationUser user)
        {
            return new ApplicationUserModel
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                RegistrationDate = user.RegistrationDate,
                EmailConfirmed = user.EmailConfirmed
            };
        }

        public IQueryable<ApplicationUser> GetAll()
        {
            return _dbContext.Users;
        }

        public void Destroy(IEnumerable<Guid> userIds)
        {
            var users = _dbContext.Users.Where(x => userIds.Contains(x.Id)).ToList();
            _dbContext.Users.RemoveRange(users);
            _dbContext.SaveChanges();
        }
    }
}
