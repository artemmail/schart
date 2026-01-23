using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace sl_par
{
    internal class finam_parsing
    {

        List<object> ConvertJsonToNewFormat(List<RowData> dataItems)
        {
            var convertedList = new List<object>();



            foreach (var item in dataItems)
            {
                foreach (var kvp in item.DataChart)
                {
                    convertedList.Add(new
                    {
                        name = item.Title,
                        year = kvp.Key,
                        value = kvp.Value
                    });
                }
            }

            return convertedList;
        }

        void ProcessFilesInDirectory(string inputDirectory, string outputDirectory)
        {
            // Получаем все HTML файлы в указанной папке
            var files = Directory.GetFiles(inputDirectory, "*.html");

            // Парсер для обработки таблиц
            var parser = new FinancialTableParser();

            // Проходим по каждому файлу
            foreach (var file in files)
            {
                try
                {
                    // Парсим файл и получаем данные
                    var result = parser.ParseFinancialTable(file);

                    // Конвертируем данные в нужный формат
                    var convertedData = ConvertJsonToNewFormat(result);

                    // Извлекаем тикер из имени файла (предполагается, что имя файла содержит тикер)
                    var ticker = Path.GetFileNameWithoutExtension(file);

                    // Создаем папку для тикера, если она не существует
                    var tickerOutputDirectory = Path.Combine(outputDirectory, ticker, "FIN");
                    Directory.CreateDirectory(tickerOutputDirectory);

                    // Сохраняем данные в JSON файл
                    var outputFilePath = Path.Combine(tickerOutputDirectory, "data.json");
                    File.WriteAllText(outputFilePath, JsonConvert.SerializeObject(convertedData));
                }
                catch (Exception ex)
                {
                }
            }
        }

        public void run()
        {
            string inputDirectory = "C:/log/financial";
            string outputDirectory = "C:/log/fin";
            // Запуск обработки файлов
            ProcessFilesInDirectory(inputDirectory, outputDirectory);
            File.WriteAllText("C:/log/legend.json", JsonConvert.SerializeObject(FinancialTableParser.descr));
        }
    }
}
