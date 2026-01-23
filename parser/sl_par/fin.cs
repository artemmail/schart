

using System;
using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using PuppeteerSharp;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml;

using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using Newtonsoft.Json;
using static System.Net.WebRequestMethods;


class Program
{
    /*

    public static (string FoundTickersJson, string NotFoundTickersJson) ScanDirectoryForTickers(string directoryPath)
    {
        var files = Directory.GetFiles(directoryPath, "*.html");

        var foundTickers = new List<object>();
        var notFoundTickers = new List<string>();

        foreach (var file in files)
        {
            string fileName = Path.GetFileNameWithoutExtension(file); // Получаем тикер из имени файла
            string fileContent = File.ReadAllText(file);

            // Паттерн для поиска блока <div id="title">
            string titlePattern = @"<div\s+id=""title"">\s*<h1\s+id=""titleText"">(.*?)<\/h1>\s*<div\s+class=""pt05x\s+mb1x"">(.*?)<\/div>\s*<\/div>";
            // Паттерн для поиска таблицы с дивидендами
            string tablePattern = @"<table\s+class=""table-generic\s+finfin-local-plugin-quote-item-dividends-table"">.*?<tbody>(.*?)<\/tbody>\s*<\/table>";

            Match titleMatch = Regex.Match(fileContent, titlePattern, RegexOptions.Singleline);
            Match tableMatch = Regex.Match(fileContent, tablePattern, RegexOptions.Singleline);

            if (titleMatch.Success)
            {
                string title = titleMatch.Groups[1].Value;
                string description = titleMatch.Groups[2].Value;

                List<Dictionary<string, object>> dividendsTable = new List<Dictionary<string, object>>();

                if (tableMatch.Success)
                {
                    string tableContent = tableMatch.Groups[1].Value;

                    // Паттерн для поиска строк таблицы
                    string rowPattern = @"<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td\s+align=""right"">(.*?)<\/td>\s*<td\s+align=""right"">(.*?)<\/td>\s*<\/tr>";
                    MatchCollection rowMatches = Regex.Matches(tableContent, rowPattern, RegexOptions.Singleline);

                    foreach (Match rowMatch in rowMatches)
                    {
                        var rowDict = new Dictionary<string, object>
                        {
                            // Преобразуем дату в формат ISO 8601
                            { "BuyBefore", ConvertToISODate(rowMatch.Groups[1].Value.Trim()) },
                            { "RecordDate", ConvertToISODate(rowMatch.Groups[2].Value.Trim()) },
                            // Преобразуем дивиденд в decimal
                            { "Dividend", ConvertToDecimal(rowMatch.Groups[3].Value.Trim()) },
                            { "Yield", rowMatch.Groups[4].Value.Trim() }
                        };

                        dividendsTable.Add(rowDict);
                    }
                }

                foundTickers.Add(new
                {
                    Ticker = fileName,
                    Title = title,
                    Description = description,
                    Dividends = dividendsTable
                });
            }
            else
            {
                notFoundTickers.Add(fileName);
            }
        }

        // Настройки сериализации в JSON с поддержкой UTF-8 без экранирования Unicode-символов
        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping // Настройка для сохранения UTF-8 без экранирования
        };

       var ttt =   foundTickers.Select(x => ("https://stockchart.ru/Dividends/"+ (x as dynamic).Ticker) as string).ToList();

        File.WriteAllLines("c:/log/ggs.txt", ttt);

        // Преобразуем списки в JSON
        string foundTickersJson = JsonSerializer.Serialize(foundTickers, jsonOptions);
        string notFoundTickersJson = JsonSerializer.Serialize(notFoundTickers, jsonOptions);

        return (foundTickersJson, notFoundTickersJson);
    }*/

    // Метод для преобразования даты в формат ISO 8601
    private static string ConvertToISODate(string date)
    {
        DateTime parsedDate;
        if (DateTime.TryParseExact(date, "dd.MM.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out parsedDate))
        {
            return parsedDate.ToString("yyyy-MM-dd");
        }
        return date; // Если не удалось распарсить, возвращаем исходную строку
    }

    // Метод для преобразования значения дивиденда в decimal
    private static decimal ConvertToDecimal(string dividend)
    {
        // Убираем символ рубля и пробелы, заменяем запятую на точку
        dividend = dividend.Replace("₽", "").Trim().Replace(",", ".");

        if (decimal.TryParse(dividend, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal parsedDividend))
        {
            return parsedDividend;
        }
        return 0m; // Если не удалось распарсить, возвращаем 0
    }
    public static async Task ddd()
        {

        string[] t = { "AGRO", "BANE", "BANEP", "CIAN", "IGSTP", "LSNGP", "MRKV", "RKKE", "SIBN", "TATNP", "TCSG", "DVEC", "GEMC", "MRKP", "MRKU", "OGKB", "PLZL", "RASP", "EELT", "SVAV", "TATN", "TGKA", "YAKG", "GCHE", "LNZL", "MRKC", "OMZZP", "AMEZ", "AQUA", "LSNG", "MVID", "PMSB", "SBERP", "UNAC", "FESH", "KRKNP", "MAGN", "MGTS", "OZON", "LIFE", "IGST", "MSRS", "ROSN", "MTLR", "VKCO", "ABRD", "FIXP", "MAGEP", "RUAL", "TRMK", "HIMCP", "KROT", "MSNG", "VEON-RX", "KMAZ", "ENPG", "LSRG", "RGSS", "AFKS", "BELU", "CNTL", "KAZT", "NKNC", "OKEY", "POSI", "SBER", "SMLT", "VRSB", "BSPB", "CHMF", "CHMK", "KLSB", "LNZLP", "MOEX", "LENT", "UTAR", "ALRS", "AVAN", "NVTK", "UPRO", "CBOM", "WUSH", "AKRN", "FEES", "LKOH", "MGNT", "NAUK", "PRFN", "BLNG", "RNFT", "RTKM", "GAZP", "MDMG", "MGTSP", "MTLRP", "POLY", "SNGSP", "TGKN", "PIKK", "SGZH", "STSB", "TTLK", "APTK", "MRKK", "SNGS", "SVET", "FLOT", "KMEZ", "MTSS", "NKNCP", "NLMK", "RUSI", "SPBE", "VTBR", "UWGN", "IRKT", "KZOSP", "MRKZ", "PAZA", "AFLT", "BSPBP", "DSKY", "NMTP", "QIWI", "ZVEZ", "BRZL", "ETLN", "KZOS", "MRKY", "TRNFP", "HYDR", "IRAO", "LVHK", "MISBP", "MSTT", "PHOR", "RDRB", "GLTR", "GMKN", "ROLO", "SELG", "RTKMP", "LPSB", "BISVP", "VGSB", "NFAZ", "JNOSP", "KGKC", "KUBE", "USBN", "NSVZ", "NKHP", "TGKB", "GTRK", "KUZB", "ROST", "YRSBP", "CNTLP", "VLHZ", "TGKBP", "WTCM", "RENI", "PMSBP", "KAZTP", "CHKZ", "VJGZ", "ASSB", "UNKL", "TORSP", "NNSB", "VSMO", "MRKS", "INGR", "GAZA", "VRSBP", "STSBP", "ZILL", "KRSB", "KRSBP", "VJGZP", "TUZA", "TASB", "KROTP", "ARSA", "DIOD", "SLEN", "KOGK", "SFIN", "VGSBP", "MRSB", "KGKCP", "GEMA", "ROSB", "KRKOP", "RTSBP", "YRSB", "JNOS", "TORS", "KCHEP", "NNSBP", "RTSB", "MAGE", "DZRDP", "YKEN", "RZSB", "MISB", "CHGZ", "RBCM", "KCHE", "YKENP", "TNSE", "SAGOP", "GAZAP", "SARE", "SAREP", "WTCMP", "UKUZ", "TASBP", "KRKN", "URKZ", "VSYD", "DZRD", "RTGZ", "NKSH", "MFGS", "MFGSP", "KBSB", "SAGO", "VSYDP", "RU000A1027E5", "PRMB", "RU000A101UK9", "RU000A0JNUM1", "ELFV", "GECO", "CARM", "ABIO", "SOFL", "ASTR", "HNFG", "EUTR", "UGLD", "SVCB", "MGKL", "DELI", "DIAS", "KLVZ", "LEAS", "ZAYM", "MBNK", "SVETP", "IVAT", "ELMT", "VSEH", "PRMD", "YDEX", "APRI" };



        //    string url = $"https://www.finam.ru/quote/moex/{ticker}/dividends/";


        var renderer = new WebPageRenderer();


        foreach (var ticker in t.OrderBy(x => x))
        {
            string p = "tv";

            string filePath = $"c:/log/{p}/{ticker}.html";



            // Создаем экземпляр класса для рендеринга страницы
            //   string url = $"https://www.finam.ru/quote/moex/{ticker}/{p}/";

            string url =// $"https://www.finam.ru/quote/moex/{ticker}/{p}/";

            // $"https://ru.tradingview.com/symbols/ALOR-{ticker}/";


               $"https://ai.finam.ru/profile/MOEX:{ticker}#general";


            // Вызываем метод рендеринга страницы
            await renderer.RenderPageAsync(url, filePath);

        }

    }
    

    public static void ScanDirectory(string directoryPath)
    {
        // Получаем все файлы с расширением .html в указанной папке
        string[] files = Directory.GetFiles(directoryPath, "*.html");

        // Словарь для хранения данных: {ticker : content}
        Dictionary<string, string> result = new Dictionary<string, string>();

        // Регулярное выражение для поиска нужного div и ticker из имени файла
        

        string divPattern = @"<div class=""prose"">\s*(.*?)\s*<\/div>";


        foreach (var file in files)
        {
            // Извлекаем ticker из имени файла (например, filePath = "AAPL.html", ticker = "AAPL")
            string ticker = Path.GetFileNameWithoutExtension(file);

            // Читаем содержимое файла
            string htmlContent = System.IO.File.ReadAllText(file);

            // Ищем div с нужным классом и текстом
            Match match = Regex.Match(htmlContent, divPattern, RegexOptions.Singleline);

            if (match.Success)
            {
                // Извлекаем содержимое div
                string content = match.Groups[1].Value;

                // Добавляем ticker и содержимое в словарь
                result.Add(ticker, content);
            }
        }

        // Преобразуем результат в JSON и сохраняем в файл
        string jsonResult = JsonConvert.SerializeObject(result);
        System.IO. File.WriteAllText(Path.Combine(directoryPath, "result.json"), jsonResult);

        var t = result.Keys.ToArray();

        Console.WriteLine("Парсинг завершен. Результат сохранен в result.json");
    }

    static async Task Main(string[] args)
    {
        ScanDirectory("c:/log/tv");

   //    await ddd();

        /*
        // string ticker = "GAZP";
        string directoryPath = @"C:\log\dividends";  // Укажите путь к папке
        var result = ScanDirectoryForTickers(directoryPath);

        Console.WriteLine("Tickers found:");
        File.WriteAllText("c:/log/gg.txt",result.FoundTickersJson);
        Console.WriteLine(result.FoundTickersJson);

        Console.WriteLine("\nTickers not found:");
        Console.WriteLine(result.NotFoundTickersJson);
        */

    }
}

public class WebPageRenderer
{
    public async Task RenderPageAsync(string url, string filePath)
    {
        var browserFetcher = new BrowserFetcher();
        await browserFetcher.DownloadAsync();

        var options = new LaunchOptions
        {
            Headless = false,
            Args = new[] { "--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled" }
        };

        using (var browser = await Puppeteer.LaunchAsync(options))
        using (var page = await browser.NewPageAsync())
        {
            await page.SetUserAgentAsync("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36");

            // Устанавливаем предварительно полученные куки (если они есть)
            // await page.SetCookieAsync(new CookieParam { Name = "cookie_name", Value = "cookie_value", Domain = "example.com" });

            /*
            await page.GoToAsync(url);

            // Сохраняем куки после первого запроса
            var cookies = await page.GetCookiesAsync();
            foreach (var cookie in cookies)
            {
                Console.WriteLine($"{cookie.Name} = {cookie.Value}");
            }
            Thread.Sleep(2222);*/

            // Отслеживаем запросы для их возможной отмены
            var requestAbortCts = new CancellationTokenSource();
            page.Request += (sender, e) =>
            {
                if (requestAbortCts.IsCancellationRequested)
                {
                    e.Request.AbortAsync(); // Отменяем запросы после 20 секунд
                }
            };

            // Запускаем навигацию
            var navigationTask = page.GoToAsync(url);

            // Ждем завершения загрузки или тайм-аута
            var completedTask = await Task.WhenAny(navigationTask, Task.Delay(TimeSpan.FromSeconds(10)));

            if (completedTask != navigationTask)
            {
                // Если прошел таймаут, то начинаем отменять запросы
                Console.WriteLine("Timeout reached, cancelling further requests.");
                requestAbortCts.Cancel();
            }




            var content = await page.GetContentAsync();
            await  System.IO. File.WriteAllTextAsync(filePath, content);
        }
    }
}
