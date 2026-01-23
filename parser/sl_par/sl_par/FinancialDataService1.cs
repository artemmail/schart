using System.Net.Http;
using System.Runtime.ConstrainedExecution;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using HtmlAgilityPack;
using Newtonsoft.Json;



/// <summary>
/// Legacy implementation of Smart-Lab financial data parsing.
/// </summary>
public class FinancialDataService1
{
    private readonly HttpClient _httpClient;

    public FinancialDataService1(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public List<string> ParseRowCells(HtmlNode row)
    {
        var cells = row.SelectNodes(".//td");

        var result = new List<string>();
        var foundLinks = false;

        foreach (var cell in cells)
        {
            // Найти все теги <a> внутри <td>
            var anchors = cell.SelectNodes(".//a[@href]");

            if (anchors != null)
            {
                foreach (var anchor in anchors)
                {
                    // Извлечь значение атрибута href
                    var hrefValue = anchor.GetAttributeValue("href", string.Empty);

                    if (!string.IsNullOrEmpty(hrefValue))
                    {
                        result.Add(hrefValue);
                        foundLinks = true;
                    }
                }
            }

            // Если ссылки не найдены, добавить текст ячейки
            if (!foundLinks)
            {
                var innerText = cell.InnerText.Trim().Replace("\t", "");
                result.Add(innerText);
            }

            // Сбрасываем флаг после обработки каждой ячейки
            foundLinks = false;
        }

        return result;
    }


    

    public async Task<string> recom(string companyId)
    {

        var url = $"https://smart-lab.ru/q/{companyId}/f/y/MSFO";
        var response = await _httpClient.GetStringAsync(url);



        HtmlDocument document = new HtmlDocument();
        document.LoadHtml(response);

        // Находим элементы reasons-up и reasons-down
        var reasonsUpNodes = document.DocumentNode.SelectNodes("//div[@class='reasons-up']//ul[@class='list-reasons']//li");
        var reasonsDownNodes = document.DocumentNode.SelectNodes("//div[@class='reasons-down']//ul[@class='list-reasons2']//li");

        // Инициализируем списки для хранения текста
        List<string> reasonsUp = new List<string>();
        List<string> reasonsDown = new List<string>();

        // Сканируем и добавляем текст из элементов reasons-up
        if (reasonsUpNodes != null)
        {
            foreach (var node in reasonsUpNodes)
            {
                reasonsUp.Add(node.InnerText.Trim());
            }
        }

        // Сканируем и добавляем текст из элементов reasons-down
        if (reasonsDownNodes != null)
        {
            foreach (var node in reasonsDownNodes)
            {
                reasonsDown.Add(node.InnerText.Trim());
            }
        }

        // Создаем объект для хранения результатов
        var result = new
        {
            ReasonsUp = reasonsUp,
            ReasonsDown = reasonsDown
        };

        // Сериализуем результат в JSON
        string jsonResult = JsonConvert.SerializeObject(result, Formatting.Indented);


        // Выводим результат в консоль
        return (jsonResult);


    }
    public async Task<List<FinancialReport>> FetchFinancialDataAsync(string companyId, string per = "y", string otch = "MSFO")
    {
        var url = $"https://smart-lab.ru/q/{companyId}/f/{per}/{otch}/";
        var response = await _httpClient.GetStringAsync(url);

        var doc = new HtmlDocument();
        doc.LoadHtml(response);

        var table = doc.DocumentNode.SelectSingleNode("//table");

        if (table == null)
            return null;

        var rows = table.SelectNodes(".//tr").Where(x => x.OuterHtml.StartsWith("<tr field")).ToArray();
        var headerRow = table.SelectNodes(".//tr").Where(x => x.OuterHtml.Contains("header_row")).First();

        var years = ParseRowCells(headerRow);

        var nameCaptionDictionary = new Dictionary<string, string>();
        var res = new List<object>();

        foreach (var row in rows)
        {
            var name = row.Attributes[0].Value;
            if (!name.Contains("smartlab"))
            {

                var caption = row.SelectNodes(".//th").First().InnerText.Trim().Replace("\t", "").Replace("\u00A0", "");

                nameCaptionDictionary[name] = caption;

                var values = ParseRowCells(row);

                for (var i = 0; i < years.Count; i++)
                {
                    string v = years[i].Trim().Replace("\t", "").Replace("\u00A0", "").Replace("&nbsp;", "");
                    if (!string.IsNullOrWhiteSpace(v))
                    {
                        res.Add(new
                        {
                            name,
                            year = v,
                            value = values[i]
                        });
                    }
                }
            }

        }

        var resultJson = JsonConvert.SerializeObject(res);
        var nameCaptionJson = JsonConvert.SerializeObject(nameCaptionDictionary);

        /*
       
        File.WriteAllText($"c:/zip/data_{per}_{companyId}.json", resultJson);

        var nameCaptionJson = JsonConvert.SerializeObject(nameCaptionDictionary);
        File.WriteAllText($"c:/zip/dic_{per}_{companyId}.json", nameCaptionJson);
        */

        string baseDirectory = "c:/zip/";
        string targetDirectory = Path.Combine(baseDirectory, companyId.ToString(), otch, per.ToString());

        // Создаем директорию, если ее нет
        Directory.CreateDirectory(targetDirectory);

        // Полные пути к файлам
        string resultFilePath = Path.Combine(targetDirectory, "data.json");
        string dicFilePath = Path.Combine(targetDirectory, "dic.json");

        // Сохраняем файлы
        File.WriteAllText(resultFilePath, resultJson);
        File.WriteAllText(dicFilePath, nameCaptionJson);
        return null;
    }
}
