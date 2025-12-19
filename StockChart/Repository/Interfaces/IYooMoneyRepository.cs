using Yoomoney.model;

namespace StockChart.Repository.Services
{
    public interface IYooMoneyRepository
    {
        public OperationDetails? operationDetails(string operationId);
        public List<OperationHistory>? operationHistory(int from, int count);
        public string authorize();
        public string token(string code);
    }
}