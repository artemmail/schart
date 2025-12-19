using DataProvider.Models;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Sockets;
using System.Threading;
using System;

namespace DataProvider.Models
{
    public class TickerContainer
    {
        Queue<DBRecord> history = new Queue<DBRecord>();
        Queue<DBRecord> update = new Queue<DBRecord>();
        public long LastNum;
        TickerDIC ticker;
        DateTime initDate = DateTime.Now - TimeSpan.FromDays(200);
        decimal prevPriceh = 0;
        int prevdirh = 0;
        decimal prevPriceu = 0;
        int prevdiru = 0;
        string iqticker;
        public volatile bool finishedHistory = false;
        public TickerContainer(string iqticker)
        {
            this.iqticker = iqticker;
            //lock (SQLHelper.TickerDic)
            {
                ticker = SQLHelper.TickerDic[iqticker];
            }
            LastNum = LastIdsContainer.GetLastId(ticker.id);
            if (LastNum > 0)
            {
                long dat = LastNum / 1000000000;
                int da = (int)dat;
                initDate = new DateTime(da / 10000, (da / 100) % 100, da % 100);
            }
        }
        public int size()
        {
            int s = 0;
            lock (history)
                s += history.Count;
            lock (update)
                s += update.Count;
            return s;
        }
        DBRecord deque1()
        {
            if (!finishedHistory)
                return null;
            DBRecord h = null;
            DBRecord u = null;
            lock (history)
                if (history.Any())
                    h = history.First();
            lock (update)
                if (update.Any())
                    u = update.First();
            if (h == null && u == null)
                return null;
            if (h == null)
                lock (update)
                    return update.Dequeue();
            if (u == null || h.number < u.number)
                lock (history)
                    return history.Dequeue();
            else
            {
                lock (history)
                    history.Clear();
                lock (update)
                    return update.Dequeue();
            }
        }
        //public DBRecord deque()
        //{
        //    var record = deque1();
        //    if (record==null)
        //        return null;
        //    if (record.number>LastNum)
        //    {
        //        LastNum=record.number;
        //        return record;
        //    }
        //    else
        //    {
        //        int a = 1;
        //        a++;
        //        return null;
        //    }
        //}


        public IEnumerable<DBRecord> quque()
        {
            DBRecord record;
            while ((record = deque1()) != null)
                if (record.number > LastNum)
                {
                    LastNum = record.number;
                    yield return record;
                }
        }
        public void enqueueHistory(string[] split)
        {
            DBRecord record = new DBRecord(iqticker, split, prevPriceh, prevdirh);
            prevPriceh = record.price;
            prevdirh = record.direction;
            if (record.number > LastNum)
                lock (history)
                    history.Enqueue(record);
        }
        public bool started = false;
        public void enqueueUpdate(string[] split)
        {
            started = true;
            DBRecord record = new DBRecord(split, prevPriceu, prevdiru);
            prevPriceu = record.price;
            prevdiru = record.direction;
            lock (update)
                update.Enqueue(record);
        }
        public void RecieveFeed(CancellationToken token)
        {
            string[] nasdaq = new string[0];// { "AAPL", "FB", "NVDA", "AMZN", "TSLA" };            
            bool isNasdaq = nasdaq.Contains(iqticker);
            using (var socket = new TcpClient("127.0.0.1", 9100/* 5009*/))
            using (NetworkStream networkStream = socket.GetStream())
            {
                //TickerReciever.GetHistory(networkStream, iqticker, initDate);
                using (StreamReader streamReader = new StreamReader(networkStream))
                {
                    var line = streamReader.ReadLine();
                    while (!streamReader.EndOfStream)
                    {
                        if (token.IsCancellationRequested)
                            return;
                        line = streamReader.ReadLine();
                        if (line.Contains("ENDM"))
                        {
                            finishedHistory = true;
                            return;
                        }
                        else
                        {
                            string[] split = line.Split(',');
                            if (split.Length > 5)
                                enqueueHistory(split);
                        }
                    }
                }
            }
        }
    }
}
