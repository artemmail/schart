
using Microsoft.AspNetCore.Http;
using System.Net;
using Yoomoney.model;
using Newtonsoft.Json;


namespace StockChart.Repository.Services
{
    public class YooMoneyRepository: IYooMoneyRepository
    {
        const string client_id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        const string Bearer = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy";
        const string redirect = "https%3A%2F%2Fstockchart.ru/admin/yandexget";
        public YooMoneyRepository() { }

        public OperationDetails? operationDetails(string operationId)
        {
            var responseJson = request("api/operation-details", $"operation_id={operationId}");
            return JsonConvert.DeserializeObject<OperationDetails>(responseJson);
        }

        public List<OperationHistory>? operationHistory(int from, int count)
        {
            var responseJson = request("api/operation-history", $"records={count}&start_record={from}");
            var operationHistoryResponse = JsonConvert.DeserializeObject<OperationHistoryResponse>(responseJson);
            return operationHistoryResponse?.Operations;
        }     

        public string authorize()
        {
            var data = $"client_id={client_id}&response_type=code&redirect_uri={redirect}t&scope=account-info%20operation-history%20operation-details";
            return request("oauth/authorize", data, false);
        }
        public string token(string code)
        {
            var data = $"code={code}&client_id={client_id}&grant_type=authorization_code&&redirect_uri={redirect}";
            return request("oauth/authorize", data, false);
        }
        string request(string function, string data, bool token = true)
        {
            var url = $"https://yoomoney.ru/{function}";
         
            var httpRequest = (HttpWebRequest)WebRequest.Create(url);
            httpRequest.Method = "POST";
            
            if (token)
                httpRequest.Headers["Authorization"] = $"Bearer {Bearer}";
            httpRequest.ContentType = "application/x-www-form-urlencoded";
            using (var streamWriter = new StreamWriter(httpRequest.GetRequestStream()))
            {
                streamWriter.Write(data);
            }
            var httpResponse = (HttpWebResponse)httpRequest.GetResponse();
            using (var streamReader = new StreamReader(httpResponse.GetResponseStream()))
            {
                return streamReader.ReadToEnd();
            }
        }
    }
}
