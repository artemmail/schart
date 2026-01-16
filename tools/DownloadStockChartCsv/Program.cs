

using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;

namespace DownloadStockChartCsv
{
    class trade
    {
        static CultureInfo c = CultureInfo.InvariantCulture;
        public static CultureInfo _DateTimeCulture = CultureInfo.CreateSpecificCulture("ru-RU");

        public trade(string[] s)
        {
            time = DateTime.Parse(s[1], _DateTimeCulture);
            price = decimal.Parse(s[2], c);
            quantity = int.Parse(s[3], c);
            direction = (short)(short.Parse(s[4], c) * 2 - 1); // 0/1 -> -1/+1
            volume = decimal.Parse(s[5], c);
        }

        public DateTime time;
        public decimal price;
        public int quantity;
        public short direction;
        public decimal volume;
    }

    public class CookieAwareWebClient : WebClient
    {
        public CookieContainer CookieContainer { get; private set; }

        public CookieAwareWebClient() : this(new CookieContainer()) { }

        public CookieAwareWebClient(CookieContainer container)
        {
            CookieContainer = container;
        }

        protected override WebRequest GetWebRequest(Uri address)
        {
            var request = (HttpWebRequest)base.GetWebRequest(address);
            request.CookieContainer = CookieContainer;
            request.AllowAutoRedirect = true;
            return request;
        }
    }

    class Program
    {
        class link
        {
            public string text;
            public string url;
        }

        static Func<string, DateTime> f = d =>
        {
            // Ищем подстроку между _ и . содержащую ровно 8 цифр
            var match = Regex.Match(d, @"_(\d{8})\.");
            if (!match.Success)
                throw new FormatException("Дата не найдена в строке.");

            string dateStr = match.Groups[1].Value;

            return new DateTime(
                int.Parse(dateStr.Substring(0, 4)),
                int.Parse(dateStr.Substring(4, 2)),
                int.Parse(dateStr.Substring(6, 2))
            );
        };

        static Func<string, bool> valid = d =>
        {
            try { var _ = f(d); return true; } catch { return false; }
        };

        static void Main(string[] args)
        {
            string dir = Directory.GetCurrentDirectory();
            DateTime startDate = new DateTime(2020, 1, 1);
            DateTime finishDate = new DateTime(2100, 1, 1);
            string ticker = null;
            bool update = false;
            string userName = null;
            string password = null;

            // === Парсинг аргументов ===
            try
            {
                for (int i = 0; i < args.Length; i++)
                {
                    string arg = args[i];
                    if (arg == "-dir") dir = args[++i];
                    else if (arg == "-start") 
                        startDate = DateTime.Parse(args[++i]);
                    else if (arg == "-finish") finishDate = DateTime.Parse(args[++i]);
                    else if (arg == "-ticker") ticker = args[++i];
                    else if (arg == "-update") update = true;
                    else if (arg == "-login") 
                        userName = args[++i];
                    else if (arg == "-pass") 
                        password = args[++i];
                }
            }
            catch
            {
                Console.WriteLine("❌ Ошибка в параметрах запуска");
                return;
            }

            // === Подготовка каталога ===
            Directory.SetCurrentDirectory(dir);
            Directory.CreateDirectory(ticker);
            Directory.SetCurrentDirectory(ticker);

            // === Обработка -update ===
            if (update)
            {
                var rr = Directory.GetCurrentDirectory();

                var lastFile = Directory.GetFiles(rr, "*.*").Where(valid).OrderByDescending(f).FirstOrDefault();
                try
                {
                    if (lastFile != null)
                    {
                        string[] lines = File.ReadAllLines(lastFile);
                        var last = new trade(lines.Last().Split(';'));
                        int timeValue = last.time.Hour * 100 + last.time.Minute;

                        if (last.time.Date == DateTime.Now.Date || (timeValue < 2340 && timeValue != 1849))
                            File.Delete(lastFile);
                    }
                }
                catch { if (lastFile != null) File.Delete(lastFile); }

                var lastCsv = Directory.GetFiles(".", "*.csv").Where(valid).OrderByDescending(f).FirstOrDefault();
                if (lastCsv != null) startDate = f(lastCsv) + TimeSpan.FromDays(1);
            }

            var client = new CookieAwareWebClient();

            // === Авторизация ===
            if (!string.IsNullOrEmpty(userName) && !string.IsNullOrEmpty(password))
            {
                try
                {
                    string loginUrl = "https://stockchart.ru/api/auth/login";
                    var loginPayload = new
                    {
                        UserName = userName,
                        Password = password
                    };

                    string json = JsonConvert.SerializeObject(loginPayload);
                    client.Headers[HttpRequestHeader.ContentType] = "application/json";

                    Console.WriteLine($"🔐 Авторизация {userName}...");
                    string loginResp = client.UploadString(loginUrl, "POST", json);
                    Console.WriteLine("✅ Успешная авторизация. Ответ: " + loginResp);
                }
                catch (WebException ex)
                {
                    using (var reader = new StreamReader(ex.Response.GetResponseStream()))
                    {
                        string error = reader.ReadToEnd();
                        Console.WriteLine("❌ Ошибка при логине: " + error);
                        return;
                    }
                }
                finally
                {
                    client.Headers.Remove(HttpRequestHeader.ContentType);
                }
            }
            else
            {
                Console.WriteLine("❌ логин и пароль нужны ");
                return;

            }

            // === Получение списка дат ===
            string dateListJson;
            try
            {
                Console.WriteLine("📅 Получаем список доступных дат...");
                string listUrl = $"https://stockchart.ru/api/Feed/GetDates?ticker={ticker}";
                dateListJson = client.DownloadString(listUrl);
            }
            catch (WebException ex)
            {
                Console.WriteLine("❌ Ошибка при получении дат: " + ex.Message);
                return;
            }

            Func<string, DateTime> extractDate = x =>
            {
                var m = Regex.Match(x, @"date=(\d{1,2}\.\d{1,2}\.\d{4})");
                if (!m.Success) throw new Exception("Дата не найдена");
                return DateTime.ParseExact(m.Groups[1].Value, "d.M.yyyy", CultureInfo.InvariantCulture);
            };

            var links = JsonConvert.DeserializeObject<List<link>>(dateListJson)
                .Where(x => extractDate(x.url) >= startDate && extractDate(x.url) <= finishDate)
                .OrderBy(x => extractDate(x.url))
                .ToList();

            // === Скачивание файлов ===
            foreach (var file in links)
            {
                try
                {
                    string fullUrl = "https://stockchart.ru/api" + file.url;
                    Console.WriteLine("⬇ Скачиваем: " + fullUrl);
                    client.DownloadFile(fullUrl, file.text);
                }
                catch (WebException ex)
                {
                    Console.WriteLine($"❌ Ошибка при скачивании {file.text}: {ex.Message}");
                }
            }

            Console.WriteLine("✅ Загрузка завершена.");
        }
    }
}
