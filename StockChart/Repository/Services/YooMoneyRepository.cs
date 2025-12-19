
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System;
using System.Net;
using StockChart.Repository;
using Yoomoney.model;
using Newtonsoft.Json;


namespace StockChart.Repository.Services
{
    public class YooMoneyRepository: IYooMoneyRepository
    {
        private readonly string _clientId;
        private readonly string _bearer;
        private readonly string _redirect;

        public YooMoneyRepository(IOptions<YooMoneyOptions> options)
        {
            var settings = options.Value;
            _clientId = settings.ClientId ?? throw new ArgumentNullException(nameof(settings.ClientId));
            _bearer = settings.Bearer ?? throw new ArgumentNullException(nameof(settings.Bearer));
            _redirect = settings.RedirectUri ?? throw new ArgumentNullException(nameof(settings.RedirectUri));
        }

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
            var data = $"client_id={_clientId}&response_type=code&redirect_uri={_redirect}t&scope=account-info%20operation-history%20operation-details";
            return request("oauth/authorize", data, false);
        }
        public string token(string code)
        {
            var data = $"code={code}&client_id={_clientId}&grant_type=authorization_code&&redirect_uri={_redirect}";
            return request("oauth/authorize", data, false);
        }
        string request(string function, string data, bool token = true)
        {
            var url = $"https://yoomoney.ru/{function}";
         
            var httpRequest = (HttpWebRequest)WebRequest.Create(url);
            httpRequest.Method = "POST";
            
            if (token)
                httpRequest.Headers["Authorization"] = $"Bearer {_bearer}";
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
