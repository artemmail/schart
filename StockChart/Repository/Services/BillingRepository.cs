using Microsoft.EntityFrameworkCore;
using StockChart.Model;
namespace StockChart.Repository.Services
{

    public class Ordinal
    {
        public string interval { get; set; } = string.Empty;
        public int count { get; set; }
        public double ordinalMoney { get; set; }
        public double discountMoney { get; set; }
        public int code { get; set; }
    }
    public class Referal : Ordinal
    {
        public string referalInterval { get; set; } = string.Empty;
        public int referalCount { get; set; }
    }
    public class Taxes
    {
        public DateTime discountBefore { get; set; } = DateTime.Now;
        public List<Ordinal> ordinal { get; set; } = new();
        public List<Referal> referal { get; set; } = new();
    }
    public class BillingRepository : IBillingRepository
    {
        public class Subscription
        {
            protected char interval;
            protected int count;
            protected virtual bool IsDiscountTime => DateTime.Now < billingRepository.discountBefore;
            public decimal money
            {
                get
                {
                    return IsDiscountTime ? discountMoney : ordinalMoney;
                }
            }
            public decimal ordinalMoney;
            public decimal discountMoney;
            public int code { get; set; }
            ApplicationUser user;
            protected readonly BillingRepository billingRepository;
            public Subscription(ApplicationUser user, BillingRepository billingRepository, char interval, int count, decimal ordinalMoney, decimal discountMoney, int code)
            {
                this.interval = interval;
                this.count = count;
                this.ordinalMoney = ordinalMoney;
                this.discountMoney = discountMoney;
                this.code = code;
                this.billingRepository = billingRepository;
                this.user = user;
            }

            public string period
            {
                get
                {
                    string intervalname;
                    switch (interval)
                    {
                        case 'd':
                            intervalname = "сутки";
                            break;
                        case 'w':
                            intervalname = "неделя";
                            break;
                        case 'y':
                            intervalname = "год";
                            break;
                        default:
                            intervalname = "мес";
                            break;
                    }
                    string mask = "{0} {1}";
                    List<string> list = new List<string>();
                    if ((code & 1) > 0)
                        list.Add("Мосбиржа");
                    if ((code & 2) > 0)
                        list.Add("СПБ биржа/NASDAQ/CME");
                    if ((code & 4) > 0)
                        list.Add("Криптовалюты");
                    mask += " " + string.Join(",", list);
                    return string.Format(mask, count, intervalname);

                }
                set { }
            }
            protected virtual string getMessage(ApplicationUser user)
            {
                if (user == null)
                    return null;
                return string.Format("Оплата за доступ {0} к сервису ru-ticker.com для пользователя [{1}]", period, user.UserName);
            }
            private int getDays(char interval, int count)
            {
                switch (interval)
                {
                    case 'd':
                        return (count);
                    case 'w':
                        return (count * 7);
                    case 'y':
                        return (365 * count);
                    default:
                        return (31 * count);
                }
            }
            private TimeSpan getTimeSpan(char interval, int count, decimal actualPayment, bool fixPeriod)
            {
                TimeSpan t = TimeSpan.FromDays(getDays(interval, count));
                if (!fixPeriod)
                    return t;
                var mul = actualPayment / (money * 0.98m);
                return TimeSpan.FromTicks((long)(t.Ticks * mul));
            }
            protected virtual void addPayment(ApplicationUser user, decimal payAmount, int service, int priceDiv)
            {
                addPaymentEx(user, interval, count, payAmount, service, priceDiv, true);
            }
            protected void addPaymentEx(ApplicationUser user, char interval, int count, decimal payAmount, int service, int priceDiv, bool fixPeriod)
            {
                var lastpayment = user.Payments.
                            Where(x => x.Service == service && x.ExpireDate > DateTime.Now && x.UserId == (Guid)user.Id).
                            OrderByDescending(x => x.ExpireDate).FirstOrDefault();
                DateTime lastdate = DateTime.Now;
                if (lastpayment != null)
                    lastdate = lastpayment.ExpireDate;
                Payment pay = new Payment()
                {
                    UserId = (Guid)user.Id,
                    PayAmount = payAmount / priceDiv,
                    PayDate = DateTime.Now,
                    ExpireDate = lastdate + getTimeSpan(interval, count, payAmount, fixPeriod),
                    Service = service
                };
                user.Payments.Add(pay);
                //db.SaveChanges();            
            }
            public Guid BillId
            {
                get
                {
                    if (user != null)
                    {
                        var Bill = new Bill
                        {
                            //   Id = Guid.NewGuid(),
                            UserId = (Guid)(user.Id),
                            Amount = money,
                            Services = code,
                            Date = DateTime.Now,
                            Interval = "" + interval,
                            Count = count
                        };
                        billingRepository._dbcontext.Add(Bill);
                        billingRepository._dbcontext.SaveChanges();
                        return Bill.Id;
                    }
                    return Guid.Empty;
                }
                set { }
            }
            public string message
            {
                get
                {
                    return getMessage(user);
                }
            }
            public string price
            {
                get
                {
                    if (IsDiscountTime && ordinalMoney != discountMoney)
                        return string.Format("<strike>{0} руб.</strike>{1} руб.", (int)ordinalMoney, (int)discountMoney);
                    else
                        return string.Format("{0} руб.", (int)money);
                }
                set { }
            }
            public string monthprice
            {
                get
                {
                    switch (interval)
                    {
                        case 'd':
                            return "";
                        case 'w':
                            return "";
                        case 'y':
                            return string.Format("{0} руб.", (int)money / 12);
                        default:
                            return string.Format("{0} руб.", (int)money / count);
                    }
                }
                set { }
            }
        }
        public class ReferalSubscription : Subscription
        {
            protected char referalInterval;
            protected int referalCount;
            ApplicationUser referalUser;
            public ReferalSubscription(ApplicationUser user, BillingRepository billingRepository, char interval, int count, int ordinalMoney, int discountMoney, int code, Guid? referalUser, char referalInterval, int referalCount) :
                base(user, billingRepository, interval, count, ordinalMoney, discountMoney, code)
            {
                this.referalUser = (referalUser != null)
                    ? billingRepository._dbcontext.Users.Where(x => x.Id == referalUser).FirstOrDefault()
                    : null;
                this.referalInterval = referalInterval;
                this.referalCount = referalCount;
            }
            protected override string getMessage(ApplicationUser user)
            {
                var referalName = referalUser?.UserName ?? "неизвестный пользователь";
                return string.Format("Реферал от [{2}]. Оплата за доступ {0} к сервису ru-ticker.com для пользователя [{1}]",
                    period, user?.UserName, referalName);
            }

            protected override bool IsDiscountTime
            {
                get
                {
                    return true;
                }
            }
        }
        private StockProcContext _dbcontext;
        private Taxes data = new();
        public BillingRepository(StockProcContext dbContext)
        {
            _dbcontext = dbContext;
            data = LoadTaxesFromDatabase();
        }

        private Taxes LoadTaxesFromDatabase()
        {
            var settings = _dbcontext.TaxSettings.AsNoTracking().FirstOrDefault();
            var plans = _dbcontext.SubscriptionPlans.AsNoTracking().ToList();

            var ordinalPlans = plans
                .Where(p => !p.IsReferal)
                .Select(p => new Ordinal
                {
                    interval = p.Interval,
                    count = p.Count,
                    ordinalMoney = (double)p.OrdinalMoney,
                    discountMoney = (double)p.DiscountMoney,
                    code = p.Code
                })
                .ToList();

            var referalPlans = plans
                .Where(p => p.IsReferal)
                .Select(p => new Referal
                {
                    interval = p.Interval,
                    count = p.Count,
                    ordinalMoney = (double)p.OrdinalMoney,
                    discountMoney = (double)p.DiscountMoney,
                    code = p.Code,
                    referalInterval = p.ReferalInterval ?? string.Empty,
                    referalCount = p.ReferalCount ?? 0
                })
                .ToList();

            return new Taxes
            {
                discountBefore = settings?.DiscountBefore ?? DateTime.Now,
                ordinal = ordinalPlans,
                referal = referalPlans
            };
        }
        public readonly Guid ApplicationId = new Guid("2DCBD9CE-C5C6-4EC2-88EB-9F9EDD43E885");
        public DateTime discountBefore
        {
            get { return data?.discountBefore ?? DateTime.Now; }
        }

        public IEnumerable<Subscription> getRefealSubscriptions(ApplicationUser User, Guid? referalUser)
        {
            if (referalUser == null)
            {
                foreach (var a in data.ordinal)
                    yield return new Subscription(User, this, ((string)a.interval)[0],
                        (int)a.count, (int)a.ordinalMoney, (int)a.discountMoney, (int)a.code);
            }
            else
            {
                foreach (var a in data.referal)
                    yield return new ReferalSubscription(User, this, ((string)a.interval)[0],
                        (int)a.count, (int)a.ordinalMoney, (int)a.discountMoney, (int)a.code,
                        referalUser, ((string)a.referalInterval)[0], (int)a.referalCount);
            }
        }
        private int getDays(string interval, int count)
        {
            switch (interval)
            {
                case "d":
                    return (count);
                case "w":
                    return (count * 7);
                case "y":
                    return (365 * count);
                default:
                    return (31 * count);
            }
        }

        protected void addPaymentEx(ApplicationUser user, string interval, int count, decimal payAmount, int service, int priceDiv)
        {
            var lastpayment = _dbcontext.Payments.
                        Where(x => x.Service == service && x.ExpireDate > DateTime.Now && x.UserId == (Guid)user.Id).
                        OrderByDescending(x => x.ExpireDate).FirstOrDefault();
            DateTime lastdate = DateTime.Now;
            if (lastpayment != null)
                lastdate = lastpayment.ExpireDate;
            Payment pay = new Payment()
            {
                UserId = (Guid)user.Id,
                PayAmount = payAmount / priceDiv,
                PayDate = DateTime.Now,
                ExpireDate = lastdate + TimeSpan.FromDays(getDays(interval, count)),
                Service = service
            };
            user.Payments.Add(pay);
            //db.SaveChanges();            
        }

        public PaymentShow GetUserInfo2(ApplicationUser user)
        {
            if (user == null)
                return null;

            user = _dbcontext.Users
                .Where(p => p.Id == user.Id)
                .Include(p => p.Payments)
                .FirstOrDefault();
            var payments = user.Payments.ToList();
            if (payments.Any())
            {
                return new PaymentShow()
                {
                    PayDate = payments.Min(x => x.PayDate),
                    PayAmount = payments.Sum(x => x.PayAmount),
                    ExpireDate = payments.Max(x => x.ExpireDate),
                    Service = payments.First().Service,
                    UserName = user.UserName,
                    Email = user.Email
                };
            }
            else
                return new PaymentShow()
                {
                    PayDate = DateTime.Now,
                    PayAmount = 0,
                    ExpireDate = DateTime.Now,
                    Service = 0,
                    UserName = user.UserName,
                    Email = user.Email
                };
            // return null;               
        }

        public void ApplyPayment(Bill bill)
        {
            if (bill.IsApplied)

                return;

            var user = bill.User;
            var code = bill.Services;
            var payment = bill.Amount;
            bool cryptoIncluded = (code & 0b100) > 0;
            bool cmeIncluded = (code & 0b10) > 0;
            bool micexIncluded = (code & 0b1) > 0;
            int divider = (cryptoIncluded ? 1 : 0) + (cmeIncluded ? 1 : 0) + (micexIncluded ? 1 : 0);
            if (micexIncluded)
                addPaymentEx(user, bill.Interval, bill.Count, payment, 1, divider);
            if (cmeIncluded)
                addPaymentEx(user, bill.Interval, bill.Count, payment, 2, divider);
            if (cryptoIncluded)
                addPaymentEx(user, bill.Interval, bill.Count, payment, 3, divider);

            bill.IsApplied = true;
            _dbcontext.Update(bill);
            _dbcontext.Update(user);
            _dbcontext.SaveChanges();
        }
        public void recievePayment(string Id)
        {
            Guid id = Guid.Parse(Id);
            var bill = getBill(id);
            //Subscription s = new Subscription(bill.Interval[0], bill.Count, bill.Amount, bill.Amount, bill.Services);
            
                ApplyPayment(bill);
        }

        public Bill getBill(Guid id)
        {
            return _dbcontext.Bills.Include(x => x.User).Where(x => x.Id == id).Single();
        }

        bool GetUserService(int service, Guid guid)
        {
            DateTime now = DateTime.Now;
            return (from p in _dbcontext.Payments
                    where p.Service == service && p.ExpireDate > now && p.UserId == guid
                    select p).Any();

        }
    }
}
