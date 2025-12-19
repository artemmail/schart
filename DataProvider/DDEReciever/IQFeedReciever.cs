
/*
using Newtonsoft.Json;
using StockProject.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
namespace DataProvider.Models
{      
    public class TickerReciever
    {
        string[] tickers;
        ConcurrentDictionary<string, TickerContainer> tickerContainer = new ConcurrentDictionary<string, TickerContainer>();
        const string CMDEND = "\r\n";
        public static byte[] CreateSendRequest(params string[] commands)
        {
            //return Encoding.UTF8.GetBytes(request + IQFeedConfiguration.EOL);
            var cmddata = string.Join(CMDEND, commands)+CMDEND;
            byte[] data = new byte[cmddata.Length];
            data=Encoding.ASCII.GetBytes(cmddata);
            return data;
        }
        public static void SendRequest(string request, NetworkStream network)
        {
            var result = CreateSendRequest(request);
            network.Write(result, 0, result.Length);
            network.Flush();
        }
        public static void GetHistory(NetworkStream network, string ticker, DateTime date)
        {
            string s = "HTT,{0},{1:yyyyMMdd HHmmss},{2:yyyyMMdd HHmmss},,,,1,\r\n";
            s=string.Format(s, ticker, date,DateTime.Now+TimeSpan.FromDays(2));
            SendRequest(s, network);
        }
        void UpdateThread(CancellationToken token)
        {
            using (var socket = new TcpClient("127.0.0.1", 5009))
            using (NetworkStream networkStream = socket.GetStream())
            {
                SendRequest("S,SET PROTOCOL,5.2", networkStream);
                ///"Symbol,Most Recent Trade,Most Recent Trade Size,Most Recent Trade Time,Most Recent Trade Market Center,Total Volume,Bid,Bid Size,Ask,Ask Size,Open,High,Low,Close,Message Contents,Most Recent Trade Conditions"
                SendRequest("S,SELECT UPDATE FIELDS,Symbol,Total Volume,Most Recent Trade Time,Most Recent Trade,Most Recent Trade Size,Ask,Bid,Message Contents,Most Recent Trade Conditions,Bid Change,Ask Change", networkStream);
                foreach (var ticker in tickers)
                    SendRequest("t"+ticker, networkStream);
                using (StreamReader streamReader = new StreamReader(networkStream))
                {
                    var line = streamReader.ReadLine();
                    while (!streamReader.EndOfStream)
                    {
                        token.ThrowIfCancellationRequested();
                        line=streamReader.ReadLine();
                        if (line.IndexOf("Q,")==0)
                        {
                            string[] split = line.Split(',');
                            tickerContainer[split[1]].enqueueUpdate(split);
                        }
                    }
                }
            }
        }
        void HistoryThread(CancellationToken token)
        {
            foreach (var ticker in tickerContainer.Values)
            {
                if (token.IsCancellationRequested)
                    return;
                ticker.RecieveFeed(token);
            }
        }
        //public DBRecord Dequeue()
        //{
        //    foreach (var ticker in tickerContainer.Values)
        //    {
        //        var j = ticker.deque();
        //        if (j!=null)
        //            return j;
        //    }
        //    return null;
        //}


        public IEnumerable<DBRecord> queue()
        {
            foreach (var ticker in tickerContainer.Values)            
                foreach (var record in ticker.quque())
                    yield return record;                        
        }


        public ConcurrentDictionary<string, int> size()
        {
            var d = new ConcurrentDictionary<string, int>();
            foreach (var ticker in tickers)
                d[ticker]=tickerContainer[ticker].size();
            return d;
        }
        // public  volatile bool isConnected;
        public TickerReciever(string[] tickers)
        {
            this.tickers=tickers;
            Connect();
        }
        Task UpdateThreadTask = null;
        Task HistoryThreadTask = null;
        Task fillDB2Task = null;
        CancellationTokenSource cancelTokenSource;// = new CancellationTokenSource();
        CancellationToken token;// = cancelTokenSource.Token;
        public void Connect()
        {
            cancelTokenSource=new CancellationTokenSource();
            token=cancelTokenSource.Token;
            foreach (var ticker in tickers)
                tickerContainer[ticker]=new TickerContainer(ticker);
            UpdateThreadTask=Task.Run(() => UpdateThread(token));
            HistoryThreadTask=Task.Run(() => HistoryThread(token));
            fillDB2Task=Task.Run(() => fillDB2(token));
        }
        public string status()
        {
            string result = "UpdateThreadTask "+UpdateThreadTask.Status.ToString()+"\n ";
            result+="HistoryThreadTask "+HistoryThreadTask.Status.ToString()+"\n ";
            result+="fillDB2Task "+fillDB2Task.Status.ToString()+"\n ";
            return result;
        }
        public void stopIq()
        {
            cancelTokenSource.Cancel();
        }

        public void fillDB2(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                if (queue().Any())
                    DDEReciever1.InsertToDB(queue().Take(50000).ToArray(), 4);
                else
                    Thread.Sleep(10);
            }
        }

    }
}
*/