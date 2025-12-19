using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mail;
namespace StockChart.Repository.Services
{

    public static class PaymentOperations
    {
        static public readonly DateTime discountBefore = data.discountBefore;// new DateTime(2019, 5, 10);
        public class Authenticator : DefaultAuthenticator
        {
            public override string Token { get; set; }
        }

        static dynamic _data = null;
        static dynamic data
        {
            get
            {
                if (_data == null)
                    using (var file = System.IO.File.OpenText(
                        System.Web.Hosting.HostingEnvironment.ApplicationPhysicalPath + "tax.json"))
                    {
                        JsonSerializer serializer = new JsonSerializer();
                        _data = JsonConvert.DeserializeObject(file.ReadToEnd());
                    }
                return _data;
            }
        }
        public static IEnumerable<Subscription> getRefealSubscriptions(MembershipUser referalUser)
        {
            if (referalUser == null)
            {
                foreach (var a in data.ordinal)
                    yield return new Subscription(((string)a.interval)[0],
                        (int)a.count, (int)a.ordinalMoney, (int)a.discountMoney, (int)a.code);
                /*
                yield return new Subscription('m', 1, 1200, 1200, 1);
                yield return new Subscription('m', 3, 2400, 2400, 1);
                yield return new Subscription('y', 1, 6000, 6000, 1);
                yield return new Subscription('y', 1, 6000, 6000, 6);
                yield return new Subscription('y', 1, 9000, 9000, 7);
                yield return new Subscription('d', 1, 100, 100, 1);
                yield return new Subscription('m', 1, 1500, 1500, 7);
                yield return new Subscription('m', 1, 800, 800, 6);
                */
            }
            else
            {
                foreach (var a in data.referal)
                    yield return new ReferalSubscription(((string)a.interval)[0],
                        (int)a.count, (int)a.ordinalMoney, (int)a.discountMoney, (int)a.code,
                        referalUser, ((string)a.referalInterval)[0], (int)a.referalCount);
                /*
        yield return new ReferalSubscription('y', 1, 6000, 5300, 1, referalUser, 'm', 2);
        yield return new ReferalSubscription('y', 1, 6000, 5300, 6, referalUser, 'm', 2);
        yield return new ReferalSubscription('y', 1, 9000, 8000, 7, referalUser, 'm', 2);*/
            }
        }
        public static void recievePayment(string Id)
        {
            Guid id = Guid.Parse(Id);
            using (var db = new stockEntities())
            {
                var bill = db.Bills.Where(x => x.Id == id).Single();
                Subscription s = new Subscription(bill.Interval[0], bill.Count, bill.Amount, bill.Amount, bill.Services);
                s.ApplyPayment(bill);
                MailMessage mail = new MailMessage();
                SmtpClient SmtpServer = new SmtpClient("smtp.gmail.com");
                SmtpServer.Port = 587;
                SmtpServer.Credentials = new System.Net.NetworkCredential("artemmail", "iceulakbuaviyfxs");
                SmtpServer.EnableSsl = true;
                SmtpServer.Credentials = new System.Net.NetworkCredential("ruticker", "araspopov1981");
                SmtpServer.EnableSsl = true;
                var message = new MailMessage("ruticker@gmail.com", "artemmail@gmail.com");
                message.SubjectEncoding = System.Text.Encoding.UTF8;
                message.Subject = "не прошел платеж";
                message.IsBodyHtml = true;
                message.Body = s.message;
                SmtpServer.Send(message);
            }
        }
        private static void recievePayment(string mess, decimal payAmount)
        {
            MembershipUser referalUser = Subscription.getReferalUser(mess);
            IEnumerable<Subscription> subs = getRefealSubscriptions(referalUser);
            foreach (var sub in subs)
                if (sub.ChekMessage(mess))
                {
                    sub.ApplyPayment(mess, payAmount);
                    return;
                }
            MailMessage mail = new MailMessage();
            SmtpClient SmtpServer = new SmtpClient("smtp.gmail.com");
            SmtpServer.Port = 587;
            SmtpServer.Credentials = new System.Net.NetworkCredential("ruticker", "araspopov1981");
            SmtpServer.EnableSsl = true;
            var message = new MailMessage("ruticker@gmail.com", "artemmail@gmail.com");
            message.SubjectEncoding = System.Text.Encoding.UTF8;
            message.Subject = "не прошел платеж";
            message.IsBodyHtml = true;
            message.Body = mess;
            SmtpServer.Send(message);
        }
        public static bool IsPayedUser
        {
            get
            {
                return true; return GetUserServiceCached(1) || GetUserServiceCached(2) || GetUserServiceCached(3);
            }
        }
        public static bool IsPayedUserUpdate
        {
            get
            {
                return true;
                var r = GetUserServiceCached(1) || GetUserServiceCached(2) || GetUserServiceCached(3);
                return r;
            }
        }
        static bool GetUserService(int service, Guid guid)
        {
            return true;
            using (var db = new stockEntities())
            {
                DateTime now = DateTime.Now;
                return (from p in db.Payments
                        where p.Service == service && p.ExpireDate > now && p.UserId == guid
                        select p).Any();
            }
        }
        public static bool GetUserServiceCached(int service, MembershipUser user = null)
        {
            return false;
            if ((user = user ?? Membership.GetUser()) == null)
                return false;
            Guid guid = (Guid)user.ProviderUserKey;
            string req = string.Format("USER {0},{1}", user.UserName, service);
            return (bool)AsyncRequest.GetCached(req.GetHashCode(), TimeSpan.FromMinutes(1), req, () => GetUserService(service, guid));
        }
        public static Payment GetUserInfo2(MembershipUser user)
        {
            if (user == null)
                return null;
            using (var db = new stockEntities())
            {
                var payments = db.Payments.Where(x => x.UserId == (Guid)user.ProviderUserKey).ToList();
                if (payments.Any())
                {
                    return new Payment()
                    {
                        PayDate = payments.Min(x => x.PayDate),
                        PayAmount = payments.Sum(x => x.PayAmount),
                        ExpireDate = payments.Max(x => x.ExpireDate),
                        Service = payments.First().Service,
                        UserName = payments.First().aspnet_Users.UserName,
                        Email = payments.First().aspnet_Users.aspnet_Membership.Email
                    };
                }
                else
                    return new Payment()
                    {
                        PayDate = user.CreationDate,
                        PayAmount = 0,
                        ExpireDate = user.CreationDate,
                        Service = 0,
                        UserName = user.UserName,
                        Email = user.Email
                    };
                // return null;               
            }
            /*string req = "exec GetPayedInfo2 '" + user.ProviderUserKey.ToString() + "'";
        var list = SQLHelper.listFromQuery<PaymentList>(req) as List<PaymentList>;
        if (list.Count == 0)
            return null;
        return list[0];*/
        }
    }
    public class ReferalSubscription : Subscription
    {
        protected char referalInterval;
        protected int referalCount;
        MembershipUser referalUser;
        public ReferalSubscription(char interval, int count, int ordinalMoney, int discountMoney, int code, MembershipUser referalUser, char referalInterval, int referalCount) :
            base(interval, count, ordinalMoney, discountMoney, code)
        {
            this.referalUser = referalUser;
            this.referalInterval = referalInterval;
            this.referalCount = referalCount;
        }
        protected override string getMessage(MembershipUser user)
        {
            if (user == null)
                return null;
            return string.Format("Реферал от [{2}]. Оплата за доступ {0} к сервису ru-ticker.com для пользователя [{1}]",
                period, user.UserName, referalUser.UserName);
        }
        protected override void addPayment(MembershipUser user, decimal payAmount, int service, int priceDiv)
        {
            base.addPayment(user, payAmount, service, priceDiv);
            addPaymentEx(referalUser, referalInterval, referalCount, 0, 1, priceDiv, false);
        }
        protected override bool IsDiscountTime
        {
            get
            {
                return true;
            }
        }
    }
    public class Subscription
    {
        protected char interval;
        protected int count;
        protected virtual bool IsDiscountTime
        {
            get
            {
                return (DateTime.Now < PaymentOperations.discountBefore);
            }
        }
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
        public Subscription(char interval, int count, decimal ordinalMoney, decimal discountMoney, int code)
        {
            this.interval = interval;
            this.count = count;
            this.ordinalMoney = ordinalMoney;
            this.discountMoney = discountMoney;
            this.code = code;
        }
        /*
        public Guid BillId
        {
            get
            {
                Bill 
            }
            set
            {
            }
        }*/
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
                /*
                switch (code)
                {
                    case 1:
                        return string.Format("{0} {1}", count, intervalname);                   
                    case 2:
                        return string.Format("{0} {1} FootPrint CME+Nasdaq", count, intervalname);
                    case 3:
                        return string.Format("{0} {1} + CME+Nasdaq ", count, intervalname);
                    default:
                        return string.Format("{0} {1}", count, intervalname);
                }*/
            }
            set { }
        }
        protected virtual string getMessage(MembershipUser user)
        {
            if (user == null)
                return null;
            return string.Format("Оплата за доступ {0} к сервису ru-ticker.com для пользователя [{1}]", period, user.UserName);
        }
        public static MembershipUser getUser(string m)
        {
            if (m.AllIndexesOf('[').Any())
            {
                int i1 = m.AllIndexesOf('[').Last();
                int i2 = m.AllIndexesOf(']').Last();
                return Membership.GetUser(m.Substring(i1 + 1, i2 - i1 - 1));
            }
            else
            {
                var users = Membership.GetAllUsers();
                foreach (MembershipUser item in users)
                {
                    if (m.Contains(item.UserName) && m.Length - (m.IndexOf(item.UserName) + item.UserName.Length) < 2)
                        return item;
                }
            }
            return null;
        }
        public static MembershipUser getReferalUser(string m)
        {
            if (m.Contains("Реферал"))
            {
                int i1 = m.AllIndexesOf('[').First();
                int i2 = m.AllIndexesOf(']').First();
                return Membership.GetUser(m.Substring(i1 + 1, i2 - i1 - 1));
            }
            return null;
        }
        public bool ChekMessage(string message)
        {
            string s = getMessage(getUser(message));
            return message.Contains(getMessage(getUser(message)));
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
        protected virtual void addPayment(MembershipUser user, decimal payAmount, int service, int priceDiv)
        {
            addPaymentEx(user, interval, count, payAmount, service, priceDiv, true);
        }
        protected void addPaymentEx(MembershipUser user, char interval, int count, decimal payAmount, int service, int priceDiv, bool fixPeriod)
        {
            using (var db = new stockEntities())
            {
                var lastpayment = db.Payments.
                            Where(x => x.Service == service && x.ExpireDate > DateTime.Now && x.UserId == (Guid)user.ProviderUserKey).
                            OrderByDescending(x => x.ExpireDate).FirstOrDefault();
                DateTime lastdate = DateTime.Now;
                if (lastpayment != null)
                    lastdate = lastpayment.ExpireDate;
                StockProject.Payments pay = new StockProject.Payments()
                {
                    ApplicationId = PaymentOperations.ApplicationId,
                    UserId = (Guid)user.ProviderUserKey,
                    PayAmount = payAmount / priceDiv,
                    PayDate = DateTime.Now,
                    ExpireDate = lastdate + getTimeSpan(interval, count, payAmount, fixPeriod),
                    Service = service
                };
                db.Payments.Add(pay);
                db.SaveChanges();
            }
        }
        public virtual void ApplyPayment(Bills bill)
        {
            using (stockEntities db = new stockEntities())
            {
                MembershipUser user = Membership.GetUser(bill.UserId);
                var code = bill.Services;
                var payment = bill.Amount;
                bool cryptoIncluded = (code & 0b100) > 0;
                bool cmeIncluded = (code & 0b10) > 0;
                bool micexIncluded = (code & 0b1) > 0;
                int divider = (cryptoIncluded ? 1 : 0) + (cmeIncluded ? 1 : 0) + (micexIncluded ? 1 : 0);
                if (micexIncluded)
                    addPayment(user, payment, 1, divider);
                if (cmeIncluded)
                    addPayment(user, payment, 2, divider);
                if (cryptoIncluded)
                    addPayment(user, payment, 3, divider);
            }
        }
        public virtual void ApplyPayment(string message, decimal payment)
        {
            MembershipUser user = getUser(message);
            if (user != null)
                using (stockEntities db = new stockEntities())
                {
                    bool cryptoIncluded = (code & 0b100) > 0;
                    bool cmeIncluded = (code & 0b10) > 0;
                    bool micexIncluded = (code & 0b1) > 0;
                    int divider = (cryptoIncluded ? 1 : 0) + (cmeIncluded ? 1 : 0) + (micexIncluded ? 1 : 0);
                    if (micexIncluded)
                        addPayment(user, payment, 1, divider);
                    if (cmeIncluded)
                        addPayment(user, payment, 2, divider);
                    if (cryptoIncluded)
                        addPayment(user, payment, 3, divider);
                }
        }
        public Guid BillId
        {
            get
            {
                var user = System.Web.Security.Membership.GetUser();
                if (user != null)
                {
                    var Bill = new Bills
                    {
                        Id = Guid.NewGuid(),
                        UserId = (Guid)(user.ProviderUserKey),
                        Amount = money,
                        Services = code,
                        Date = DateTime.Now,
                        Interval = "" + interval,
                        Count = count
                    };
                    using (var db = new stockEntities())
                    {
                        db.Bills.Add(Bill);
                        db.SaveChanges();
                    }
                    return Bill.Id;
                }
                return Guid.NewGuid();
            }
            set { }
        }
        public string message
        {
            get
            {
                var user = System.Web.Security.Membership.GetUser();
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
}