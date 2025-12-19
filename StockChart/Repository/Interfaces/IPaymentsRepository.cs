using KendoNET.DynamicLinq;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Model.Payments;

namespace StockChart.Repository
{
    public interface IPaymentsRepository
    {
        public PaymentModel PaymentToModel(Payment payment);
        public List<Payment> Create(IEnumerable<PaymentModel> payments);
        public List<Payment> Update(IEnumerable<PaymentModel> payments);
        public List<Payment> Destroy(IEnumerable<PaymentModel> payments);        
        public IQueryable<Payment> GetAll();
    }
}