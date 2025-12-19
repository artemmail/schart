using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using SignalRMvc.Hubs;
using StockChart.Hubs;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using System.Globalization;
using System.Net;
using static StockProcContext;
namespace StockChart.Repository
{
    public class NewsRepository: INewsRepository
    {
        private StockProcContext _dbContext;
         
        public NewsRepository(StockProcContext dbContext)
        {
            _dbContext = dbContext;
        }
        public IQueryable<Topic> GetAll(int type)
        {
            return _dbContext.Topics.OrderByDescending(x => x.Date);
        }
        // GET: Topic/Details/5
        public Topic Get(int id)
        {
            return _dbContext.Topics.Where(x => x.Id == id).FirstOrDefault();
        }
            
    }
}
