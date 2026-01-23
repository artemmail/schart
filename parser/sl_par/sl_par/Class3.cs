using HtmlAgilityPack;
using Microsoft.VisualBasic;

public class RowData
{
    public string Title { get; set; }
    public string Description { get; set; }
    public Dictionary<string, string> DataChart { get; set; }
}

public class FinancialTableParser
{


    private static string ExtractCleanText(string input)
    {
        var endIndex = input.IndexOf('<');
        if (endIndex >= 0)
        {
            return input.Substring(0, endIndex).Trim();
        }
        return input;
    }

    public static Dictionary<string,string> descr = new Dictionary<string,string>();  

    public List<RowData> ParseFinancialTable(string filePath, int tab = 0)
    {
        var document = new HtmlDocument();
        document.Load(filePath);

        /*

        var table = document.DocumentNode.SelectSingleNode("//table[@class='table-generic finfin-local-plugin-quote-item-financial-table']");
        if (table == null)
        {
            throw new Exception("Таблица не найдена.");
        }
        */

        var tables = document.DocumentNode.SelectNodes("//table[@class='table-generic finfin-local-plugin-quote-item-financial-table']");

        // Проверяем, есть ли хотя бы две таблицы
        if (tables == null || tables.Count < 2)
        {
            throw new Exception("Вторая таблица не найдена.");
        }

        // Берем вторую таблицу
        var table = tables[tab];


        var rows = table.SelectNodes(".//tbody/tr");
        var result = new List<RowData>();

        foreach (var row in rows)
        {
            string titleNode = "";
            string descriptionNode = "";
            var titleCell = row.SelectSingleNode(".//td[contains(@class, 'finfin-local-plugin-quote-item-financial-row-title')]");

            if (titleCell != null)
            {
                var nameNode = titleCell.SelectSingleNode(".//div[@class='p05x']");
                if (nameNode != null)
                {
                    // Извлекаем текстовое содержимое до первого XML-тега
                    var rawNameText = nameNode.InnerText.Trim();
                    var cleanNameText = ExtractCleanText(rawNameText);

                    var ttt = cleanNameText.Replace("&nbsp;","|").Split('|');
                    titleNode = ttt[0];
                    descriptionNode = ttt[1];
                    
                }

                // Извлечение описания строки с использованием data-role="tooltip-content"
                var descriptionNode1 = titleCell.SelectSingleNode(".//span[@data-role='tooltip-content']");
                if (descriptionNode1 != null)
                {
                    var Description = descriptionNode1.InnerText.Trim();
                }

                // Извлечение атрибута data-chart
                var dataChartNode = titleCell.SelectSingleNode(".//div[@data-chart]");
                if (dataChartNode != null)
                {
                    var dataChart = dataChartNode.GetAttributeValue("data-chart", string.Empty);

                    if (!string.IsNullOrEmpty(dataChart))
                    {
                        descr[titleNode] = descriptionNode;
                        var rowData = new RowData
                        {
                            Title = titleNode,
                            Description = "",//descriptionNode,
                            DataChart = ExtractDataChart(dataChart)
                        };

                        result.Add(rowData);
                    }
                }
            }


        }

        return result;
    }

    private Dictionary<string, string> ExtractDataChart(string dataChartJson)
    {
        // Десериализация JSON данных из атрибута data-chart.
        var dataChart = new Dictionary<string, string>();
        var json = Newtonsoft.Json.JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(System.Web.HttpUtility.HtmlDecode(dataChartJson));

        foreach (var item in json)
        {
            if (item.ContainsKey("date") && item.ContainsKey("value"))
            {
                var date = DateTime.Parse(item["date"].ToString()).ToString("yyyy");
                var value = item["value"].ToString();
                dataChart.Add(date, value);
            }
        }

        return dataChart;
    }
}