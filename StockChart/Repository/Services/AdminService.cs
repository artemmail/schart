using Microsoft.EntityFrameworkCore;
using StockChart.Repository.Interfaces;

namespace StockChart.Repository.Services
{
    public class AdminService : IAdminService
    {
        private readonly StockProcContext _dbContext;

        public AdminService(StockProcContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<ProfitData>> GetProfitAsync()
        {
            var data = await _dbContext.Payments
                .Where(p => p.PayAmount > 0)
                .GroupBy(p => new { p.PayDate.Year, p.PayDate.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Profit = g.Sum(p => p.PayAmount)
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();

            var profits = data.Select(x => new ProfitData
            {
                date = new DateTime(x.Year, x.Month, 1),
                profit = (decimal?)x.Profit
            });

            return profits;
        }

        public async Task<IEnumerable<ProfitData>> GetProfitTotalAsync()
        {
            var data = await _dbContext.Payments
                .Where(p => p.PayAmount > 0)
                .GroupBy(p => new { p.PayDate.Year, p.PayDate.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Sum = g.Sum(p => p.PayAmount)
                })
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .ToListAsync();

            decimal cumulativeSum = 0;
            var cumulativeProfits = new List<ProfitData>();
            foreach (var item in data)
            {
                cumulativeSum += item.Sum;
                cumulativeProfits.Add(new ProfitData
                {
                    date = new DateTime(item.Year, item.Month, 1),
                    profit = cumulativeSum
                });
            }

            return cumulativeProfits;
        }

        public async Task<IEnumerable<ReturnedUser>> GetReturnedUsersAsync()
        {
            var result = await (from p in _dbContext.Payments
                                where p.PayAmount > 0
                                group p by p.UserId into g
                                where g.Count() > 0 && g.Sum(p => p.PayAmount) > 0
                                select new
                                {
                                    UserId = g.Key,
                                    cnt = g.Count(),
                                    total = g.Sum(p => p.PayAmount),
                                    max = g.Max(p => p.PayAmount),
                                    min = g.Min(p => p.PayAmount),
                                    expdate = g.Max(p => p.ExpireDate)
                                })
                           .Join(_dbContext.Users,
                                 t => t.UserId,
                                 u => u.Id,
                                 (t, u) => new ReturnedUser
                                 {
                                     username = u.UserName,
                                     Email = u.Email,
                                     cnt = t.cnt,
                                     total = t.total,
                                     min = t.min,
                                     max = t.max,
                                     lastdate = u.RegistrationDate,
                                     expdate = t.expdate
                                 })
                           .OrderByDescending(r => r.cnt)
                           .ThenByDescending(r => r.total)
                           .ThenBy(r => r.username)
                           .ToListAsync();
            return result;
        }

        public async Task<IEnumerable<PaymentInfo>> GetPaymentTableAsync()
        {
            // Variable declarations
            decimal lastProfit;
            decimal totalProfit;
            decimal totalPayment;
            decimal totalUsers;
            decimal returnedUsers;
            decimal trialPayment;
            decimal failTrialPayment;

            // 1. lastProfit: Sum of PayAmount for the current month where PayAmount > 0
            var currentMonthStart = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
            var nextMonthStart = currentMonthStart.AddMonths(1);

            lastProfit = await _dbContext.Payments
                .Where(p => p.PayAmount > 0 && p.PayDate >= currentMonthStart && p.PayDate < nextMonthStart)
                .SumAsync(p => p.PayAmount);

            // 2. totalProfit: Sum of all PayAmount where PayAmount > 0
            totalProfit = await _dbContext.Payments
                .Where(p => p.PayAmount > 0)
                .SumAsync(p => p.PayAmount);

            // 3. totalUsers: Count of distinct users who have made a payment > 0
            totalUsers = await _dbContext.Payments
                .Where(p => p.PayAmount > 0)
                .Select(p => p.UserId)
                .Distinct()
                .CountAsync();

            // 4. failTrialPayment: Count of users whose total payments are less than 110
            failTrialPayment = await _dbContext.Payments
                .Where(p => p.PayAmount > 0)
                .GroupBy(p => p.UserId)
                .Where(g => g.Sum(p => p.PayAmount) < 110)
                .CountAsync();

            // 5. returnedUsers: Users with total payments > 300 and more than 2 payments
            returnedUsers = await _dbContext.Payments
                .Where(p => p.PayAmount > 0)
                .GroupBy(p => p.UserId)
                .Where(g => g.Sum(p => p.PayAmount) > 300 && g.Count() > 2)
                .CountAsync();

            // 6. trialPayment: Count of payments where PayAmount > 0 and PayAmount < 120
            trialPayment = await _dbContext.Payments
                .Where(p => p.PayAmount > 0 && p.PayAmount < 120)
                .CountAsync();

            // 7. totalPayment: Count of all payments where PayAmount > 0
            totalPayment = await _dbContext.Payments
                .Where(p => p.PayAmount > 0)
                .CountAsync();

            // Calculations for average checks, avoiding division by zero
            var totalUsersWithoutFailTrial = totalUsers - failTrialPayment;
            var avgCheck = totalUsers > 0 ? totalProfit / totalUsers : 0;
            var avgCheckWithoutTrial = totalUsersWithoutFailTrial > 0 ? totalProfit / totalUsersWithoutFailTrial : 0;

            // Constructing the result set with a defined data type
            var result = new List<PaymentInfo>
            {
                new PaymentInfo { info = totalPayment, comment = "Всего транзакций" },
                new PaymentInfo { info = totalUsers, comment = "Всего пользователей" },
                new PaymentInfo { info = returnedUsers, comment = "Вернувшихся пользователей" },
                new PaymentInfo { info = totalUsersWithoutFailTrial, comment = "Всего продливших пользователей" },
                new PaymentInfo { info = trialPayment, comment = "Пробных подписок" },
                new PaymentInfo { info = failTrialPayment, comment = "Непродленных триалов" },
                new PaymentInfo { info = avgCheck, comment = "Средний чек" },
                new PaymentInfo { info = avgCheckWithoutTrial, comment = "Средний чек без триалов" },
                new PaymentInfo { info = lastProfit, comment = "Доход за последний месяц" },
                new PaymentInfo { info = totalProfit, comment = "Доход за все время" }
            };

            // Ordering the result by 'Info' descending
            result = result.OrderByDescending(r => r.info).ToList();

            return result;
        }

        public async Task<IEnumerable<PaymentDetails>> GetTotalPaysAsync(string username)
        {
            var filtered = await _dbContext.Payments
                .Include(x => x.User)
                .Where(p => p.User.UserName == username)
                .OrderByDescending(p => p.Id)
                .Select(p => new PaymentDetails
                {
                    Id = p.Id,
                    UserName = p.User.UserName,
                    Email = p.User.Email,
                    PayAmount = p.PayAmount,
                    PayDate = p.PayDate,
                    ExpireDate = p.ExpireDate,
                    Service = p.Service
                }).ToListAsync();

            return filtered;
        }

        public async Task<IEnumerable<PaymentDetails>> GetActiveUsersAsync()
        {
            var filtered = await _dbContext.Payments
                .Include(x => x.User)
                .Where(p => p.ExpireDate > DateTime.Now)
                .OrderByDescending(p => p.Id)
                .Select(p => new PaymentDetails
                {
                    Id = p.Id,
                    UserName = p.User.UserName,
                    Email = p.User.Email,
                    PayAmount = p.PayAmount,
                    PayDate = p.PayDate,
                    ExpireDate = p.ExpireDate,
                    Service = p.Service
                }).ToListAsync();

            return filtered;
        }
    }
}
