
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Model.Payments;
using System.Globalization;
using static StockProcContext;
namespace StockChart.Repository
{
    public class PaymentsRepository : IPaymentsRepository
    {
        private StockProcContext _dbContext;
        public PaymentsRepository(StockProcContext dbContext)
        {
            _dbContext = dbContext;
        }
        public PaymentModel PaymentToModel(Payment payment)
        {
            return new PaymentModel
            {
                Id = payment.Id,
                UserName = payment.User.UserName,
                Email = payment.User.Email,
                PayAmount = payment.PayAmount,
                PayDate = payment.PayDate,
                ExpireDate = payment.ExpireDate,
                Service = payment.Service,
            };
        }
        public List<Payment> Create(IEnumerable<PaymentModel> payments)
        {
            List<Payment> createList = new List<Payment>();           
            foreach (PaymentModel model in payments)
            {               
                var Payment = new Payment
                {
                    UserId = _dbContext.Users
                        .Where(x => x.UserName == model.UserName || x.Email == model.Email)
                        .Select(x => x.Id).FirstOrDefault(),
                    PayAmount = model.PayAmount,
                    PayDate = model.PayDate,
                    ExpireDate = model.ExpireDate,
                    Service = model.Service
                };
                _dbContext.Add(Payment);
                _dbContext.SaveChanges();
                Payment = _dbContext.Payments.Include(x=>x.User).Single(x => x.Id == Payment.Id);
                createList.Add(Payment);
            }
            return createList;
        }
        public List<Payment> Update(IEnumerable<PaymentModel> payments)
        {
            List<Payment> updateList = new List<Payment>();
            foreach (PaymentModel model in payments)
            {
                var Payment = _dbContext.Payments.Single(x => x.Id == model.Id);
                Payment.PayAmount = model.PayAmount;
                Payment.PayDate = model.PayDate;
                Payment.ExpireDate = model.ExpireDate;
                Payment.Service = model.Service;
                _dbContext.Update(Payment);                
                _dbContext.SaveChanges();
                Payment = _dbContext.Payments.Include(x => x.User).Single(x => x.Id == model.Id);
                updateList.Add(Payment);
            }
                        
            return updateList;
        }

        public List<Payment> Destroy(IEnumerable<PaymentModel> payments)
        {
            List<Payment> destroyList = new List<Payment>();
            foreach (PaymentModel model in payments)
            {
                var Payment = _dbContext.Payments.Single(x => x.Id == model.Id);
                _dbContext.Remove(Payment);                
            }            
            _dbContext.SaveChanges();
            return destroyList;
        }
        public IQueryable<Payment> GetAll()
        {
            return _dbContext.Payments.Include(x=>x.User).OrderByDescending(x => x.PayDate);
        }
       
    }
}
