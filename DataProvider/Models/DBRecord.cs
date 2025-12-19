using DataProvider.Services;
using System;
using System.Globalization;

namespace DataProvider.Models
{
    public class DBRecord
    {

        public DBRecord()
        {

        }

        public DBRecord(string classname, string[] line)
        {
            number = long.Parse(line[0]);
            ticker = line[1];
            marketcode = line[2];
            datetime = DateTime.Parse(line[3], CultureInfo.InvariantCulture, DateTimeStyles.None);
            datetime += TimeSpan.FromTicks(long.Parse(line[4]));
            price = decimal.Parse(line[5], CultureInfo.InvariantCulture);
            quantity = (int)(decimal.Parse(line[6], CultureInfo.InvariantCulture));
            volume = price * quantity;
            direction = int.Parse(line[7]);
            OI = int.Parse(line[8]);
            name = line[11];
            market = 0;
            ApplyMarketCode();
        }


        public DBRecord(DateTime date, string classname, string[] line)
        {
            number = long.Parse(line[0]);
            marketcode = classname;// line[2];
            DateTime dt = DateTime.ParseExact(line[1], "HH:mm:ss", System.Globalization.CultureInfo.InvariantCulture);

            if (dt.Hour < 6)
                dt += TimeSpan.FromDays(1);

            name = line[2];
            ticker = line[4].Replace('_', '.');
            double totalSeconds = dt.TimeOfDay.TotalSeconds;
            datetime = date + TimeSpan.FromSeconds(totalSeconds);
            price = decimal.Parse(line[5], CultureInfo.InvariantCulture);
            OI = (int)decimal.Parse(line[6]);
            quantity = (int)(decimal.Parse(line[7], CultureInfo.InvariantCulture));
            volume = decimal.Parse(line[8], CultureInfo.InvariantCulture);
            direction = line[15] == "B" ? 1 : 0;
            market = 0;

            ApplyMarketCode(true);
        }

        public DBRecord(string[] line)
        {
            number = long.Parse(line[0]);

            if (number == 1430260325)
            {
                number = 1430260325;
            }


            ticker = line[1];
            marketcode = line[2];
            datetime = DateTime.Parse(line[3], CultureInfo.InvariantCulture, DateTimeStyles.None);
            datetime += TimeSpan.FromTicks(long.Parse(line[4]));

            price = (decimal)(double.Parse(line[5], CultureInfo.InvariantCulture));
            quantity = (int)(decimal.Parse(line[6], CultureInfo.InvariantCulture));
            volume = price * quantity;
            direction = int.Parse(line[7]);
            OI = int.Parse(line[8]);
            name = line[11];


            market = 0;

            ApplyMarketCode(true);

            if (SQLHelper.TickerDic.ContainsKey(ticker))
            {
                volume *= Math.Max(1, SQLHelper.TickerDic[ticker].lotsize);
            }

        }

        public DBRecord(object[] line)
        {
            if (line[-1 + 1] is string)
            {
                number = long.Parse(line[-1 + 1] as string);
            }
            else
            {
                number = (long)(double)(line[-1 + 1]);
            }

            datetime = DateTime.Parse(line[-1 + 8].ToString() + " " + line[-1 + 2]);

            try
            {
                if (line.Length >= 12)
                    datetime += TimeSpan.FromMilliseconds(int.Parse(line[-1 + 12].ToString()) / 1000.0f);
            }
            catch
            {

            }



            price = (decimal)(double)line[-1 + 4];
            volume = (decimal)(double)line[-1 + 6];
            quantity = (int)(double)line[-1 + 5];
            ticker = line[-1 + 9].ToString();
            name = line[-1 + 3].ToString();

            if (name.IndexOf('[') > 0)
                name = name.Substring(0, name.IndexOf("["));

            direction = line[-1 + 7].ToString().Length == 5 ? 1 : 0;
            try
            {
                OI = (int)(double)line[-1 + 10];
            }
            catch
            {
                OI = 0;
            }


            try
            {

                marketcode = (string)(line[-1 + 11]);

                market = 0;

                ApplyMarketCode();


            }
            catch
            {
            }
        }
        public DBRecord(string tick, string[] fields, decimal prevPrice, int prevdir)
        {
            name = ticker = tick;
            /*
            if (DateTime.TryParseExact(fields[0], "yyyy-MM-dd HH:mm:ss.ffffff", null,))
                datetime = DateTime.ParseExact(fields[0], "yyyy-MM-dd HH:mm:ss.ffffff", null);
            else*/
            //datetime = DateTime.ParseExact(fields[0], "yyyy-MM-dd HH:mm:ss.ffffff", null);
            datetime = DateTime.ParseExact(fields[0], new string[] { "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm:ss.ffffff" }, null, System.Globalization.DateTimeStyles.None);
            int n = int.Parse(fields[3]);
            number = ((long)datetime.Year * 10000 + (long)datetime.Month * 100 + datetime.Day) * 1000000000 + n;
            price = decimal.Parse(fields[1], System.Globalization.CultureInfo.InvariantCulture);
            quantity = int.Parse(fields[2]);
            volume = quantity * price;
            decimal askprice = decimal.Parse(fields[4], System.Globalization.CultureInfo.InvariantCulture);
            decimal bidprice = decimal.Parse(fields[5], System.Globalization.CultureInfo.InvariantCulture);
            OI = 0;// int.Parse(fields[6]);
            if (Math.Abs(price - askprice) == Math.Abs(price - bidprice))
            {
                direction = (prevPrice == price) ? prevdir : (price > prevPrice) ? 1 : 0;
            }
            else
                direction = Math.Abs(price - askprice) < Math.Abs(price - bidprice) ? 0 : 1;
            marketcode = "CME";
        }
        public DBRecord(string[] fields, decimal prevPrice, int prevdir)
        {
            //  "Symbol,Most Recent Trade,Most Recent Trade Size,Most Recent Trade Time,Most Recent Trade Market Center,Total Volume,Bid,Bid Size,Ask,Ask Size,Open,High,Low,Close,Message Contents,Most Recent Trade Conditions"
            //     SendRequest("S,SELECT UPDATE FIELDS,Symbol,Total Volume,Most Recent Trade Time,Most Recent Trade,Most Recent Trade Size,Ask,Bid", networkStream);
            name = ticker = fields[1];
            int n = int.Parse(fields[2]);
            datetime = DateTime.ParseExact(fields[3], new string[] { "HH:mm:ss", "HH:mm:ss.ffffff" }, null, System.Globalization.DateTimeStyles.None);
            datetime = (DateTime.Now - TimeSpan.FromHours(8)).Date + datetime.TimeOfDay;
            if (datetime > DateTime.Now)
                datetime -= TimeSpan.FromDays(1);
            number = ((long)datetime.Year * 10000 + (long)datetime.Month * 100 + datetime.Day) * 1000000000 + n;
            price = decimal.Parse(fields[4]);
            quantity = int.Parse(fields[5]);
            volume = quantity * price;
            decimal askprice = decimal.Parse(fields[6]);
            decimal bidprice = decimal.Parse(fields[7]);
            OI = 0;
            if (Math.Abs(price - askprice) == Math.Abs(price - bidprice))
            {
                direction = (prevPrice == price) ? prevdir : (price > prevPrice) ? 1 : 0;
            }
            else
                direction = Math.Abs(price - askprice) < Math.Abs(price - bidprice) ? 0 : 1;
            marketcode = "CME";
        }
        public byte market;
        public long number;
        public DateTime datetime;
        public string ticker;
        public string marketcode;
        public string name;
        public decimal price;
        public decimal volume;
        public decimal quantity;
        public int direction;
        public int OI;
        //  public string className;

        private void ApplyMarketCode(bool replaceMarketCodeWithName = false)
        {
            if (MarketInfoServiceHolder.TryGetMarket(marketcode, out var marketInfo))
            {
                market = marketInfo.MarketId;

                if (replaceMarketCodeWithName)
                    marketcode = marketInfo.Name;
            }
        }
    }
}
