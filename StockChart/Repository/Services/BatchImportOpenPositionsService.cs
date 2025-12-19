namespace StockChart.Repository.Services;

using System.IO;
using Newtonsoft.Json;
using System.Linq;
using StockChart.Model;
using System.Text.RegularExpressions;


public class BatchImportOpenPositionsService
{
    private readonly StockProcContext _context;

    public BatchImportOpenPositionsService(StockProcContext context)
    {
        _context = context;
    }

    public List<string> GetAllContracts()
    {
        return _context.OpenPositions
            .Select(op => op.ContractName)            
            .Distinct()
            .OrderBy(x => x)
            .ToList();
    }

    // Метод для получения всех открытых позиций по названию контракта
    public List<OpenPosition> GetOpenPositionsByContract(string contractName)
    {
        var d = DateTime.Now.AddDays(-180);
        return _context.OpenPositions
            .Where(op => op.ContractName == contractName && op.Date > d)
            .ToList();
    }

    public async Task ImportFromDirectory(string directoryPath)
    {
        // Получение всех файлов .json из директории
        var files = Directory.GetFiles(directoryPath, "*.json", SearchOption.AllDirectories);

        // Загружаем все данные из файлов
        var contractDataList = new List<(string contractName, List<ContractEntry> contractEntries, DateTime contractDate)>();

        foreach (var file in files)
        {
            // Извлечение имени контракта из пути
            var contractName = GetContractNameFromFilePath(file);

            // Чтение содержимого файла
            var jsonData = await File.ReadAllTextAsync(file);

            // Парсинг JSON
            var contractEntries = JsonConvert.DeserializeObject<List<ContractEntry>>(jsonData);
            if (contractEntries.Count < 4)
            {
                Console.WriteLine($"Файл {file} имеет недостаточно данных для импорта.");
                continue;
            }

            // Дата контракта из первой строки
            var contractDate = DateTime.ParseExact(contractEntries[0].Date, "dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture);

            // Добавляем данные в список для последующей обработки
            contractDataList.Add((contractName, contractEntries, contractDate));
        }

        // Считываем всю базу открытых позиций
        var existingOpenPositions = _context.OpenPositions.ToList();

        // Собираем данные для обновления или добавления
        var newOpenPositions = new List<OpenPosition>();

        foreach (var (contractName, contractEntries, contractDate) in contractDataList)
        {
            // Проверяем, есть ли уже такой контракт и дата в базе
            var existingOpenPosition = existingOpenPositions
                .FirstOrDefault(op => op.Date == contractDate && op.ContractName == contractName);

            if (existingOpenPosition != null)
            {
                // Если данные изменились, обновляем запись
                if (HasDataChanged(existingOpenPosition, contractEntries))
                {
                    UpdateExistingOpenPosition(existingOpenPosition, contractEntries);
                    Console.WriteLine($"Обновлены данные для контракта {contractName} за {contractDate}");
                }
                else
                {
                    Console.WriteLine($"Данные для контракта {contractName} за {contractDate} не изменились");
                }
            }
            else
            {
                // Если данных нет, добавляем новую запись
                var newOpenPosition = CreateNewOpenPosition(contractName, contractEntries);
                newOpenPositions.Add(newOpenPosition);
                Console.WriteLine($"Добавлены новые данные для контракта {contractName} за {contractDate}");
            }
        }

        // Добавляем новые записи в контекст
        if (newOpenPositions.Any())
        {
            _context.OpenPositions.AddRange(newOpenPositions);
        }

        // Сохраняем все изменения одной командой
        await _context.SaveChangesAsync();
    }

    // Метод для создания новой записи OpenPosition
    private OpenPosition CreateNewOpenPosition(string contractName, List<ContractEntry> contractEntries)
    {
        contractEntries = contractEntries.Select(RemoveSpacesFromEntry).ToList();
        var dailyData = contractEntries[0];
        var deltaData = contractEntries[1];
        var peopleData = contractEntries[3];

        return new OpenPosition
        {
            Date = DateTime.ParseExact(dailyData.Date, "dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture),
            JuridicalLong = long.Parse(dailyData.JuridicalLong),
            JuridicalShort = long.Parse(dailyData.JuridicalShort),
            PhysicalLong = long.Parse(dailyData.PhysicalLong),
            PhysicalShort = long.Parse(dailyData.PhysicalShort),

            JuridicalLongDelta = long.Parse(deltaData.JuridicalLong),
            JuridicalShortDelta = long.Parse(deltaData.JuridicalShort),
            PhysicalLongDelta = long.Parse(deltaData.PhysicalLong),
            PhysicalShortDelta = long.Parse(deltaData.PhysicalShort),

            JuridicalLongCount = int.Parse(peopleData.JuridicalLong),
            JuridicalShortCount = int.Parse(peopleData.JuridicalShort),
            PhysicalLongCount = int.Parse(peopleData.PhysicalLong),
            PhysicalShortCount = int.Parse(peopleData.PhysicalShort),

            ContractName = contractName
        };
    }

    // Метод для проверки, изменились ли данные
    private bool HasDataChanged(OpenPosition existingOpenPosition, List<ContractEntry> contractEntries)
    {

        contractEntries = contractEntries.Select(RemoveSpacesFromEntry).ToList();
        var dailyData = contractEntries[0];
        var deltaData = contractEntries[1];
        var peopleData = contractEntries[3];

        return existingOpenPosition.JuridicalLong != long.Parse(dailyData.JuridicalLong) ||
               existingOpenPosition.JuridicalShort != long.Parse(dailyData.JuridicalShort) ||
               existingOpenPosition.PhysicalLong != long.Parse(dailyData.PhysicalLong) ||
               existingOpenPosition.PhysicalShort != long.Parse(dailyData.PhysicalShort) ||
               existingOpenPosition.JuridicalLongDelta != long.Parse(deltaData.JuridicalLong) ||
               existingOpenPosition.JuridicalShortDelta != long.Parse(deltaData.JuridicalShort) ||
               existingOpenPosition.PhysicalLongDelta != long.Parse(deltaData.PhysicalLong) ||
               existingOpenPosition.PhysicalShortDelta != long.Parse(deltaData.PhysicalShort) ||
               existingOpenPosition.JuridicalLongCount != int.Parse(peopleData.JuridicalLong) ||
               existingOpenPosition.JuridicalShortCount != int.Parse(peopleData.JuridicalShort) ||
               existingOpenPosition.PhysicalLongCount != int.Parse(peopleData.PhysicalLong) ||
               existingOpenPosition.PhysicalShortCount != int.Parse(peopleData.PhysicalShort);
    }

    // Обновление существующих данных
    private void UpdateExistingOpenPosition(OpenPosition existingOpenPosition, List<ContractEntry> contractEntries)
    {
        var dailyData = contractEntries[0];
        var deltaData = contractEntries[1];
        var peopleData = contractEntries[3];

        // Обновляем данные
        existingOpenPosition.JuridicalLong = long.Parse(dailyData.JuridicalLong);
        existingOpenPosition.JuridicalShort = long.Parse(dailyData.JuridicalShort);
        existingOpenPosition.PhysicalLong = long.Parse(dailyData.PhysicalLong);
        existingOpenPosition.PhysicalShort = long.Parse(dailyData.PhysicalShort);

        existingOpenPosition.JuridicalLongDelta = long.Parse(deltaData.JuridicalLong);
        existingOpenPosition.JuridicalShortDelta = long.Parse(deltaData.JuridicalShort);
        existingOpenPosition.PhysicalLongDelta = long.Parse(deltaData.PhysicalLong);
        existingOpenPosition.PhysicalShortDelta = long.Parse(deltaData.PhysicalShort);

        existingOpenPosition.JuridicalLongCount = int.Parse(peopleData.JuridicalLong);
        existingOpenPosition.JuridicalShortCount = int.Parse(peopleData.JuridicalShort);
        existingOpenPosition.PhysicalLongCount = int.Parse(peopleData.PhysicalLong);
        existingOpenPosition.PhysicalShortCount = int.Parse(peopleData.PhysicalShort);
    }


    // Извлечение имени контракта из пути к файлу
    private string GetContractNameFromFilePath(string filePath)
    {
        // Пример: C:\OPT\BELU\16.08.2024.json
        // Нам нужно вытащить "BELU"
        var directoryName = Path.GetDirectoryName(filePath);
        return new DirectoryInfo(directoryName).Name;
    }

    // Импорт данных контракта (как было реализовано ранее)
    private async Task ImportContractData(string contractName, string jsonData)
    {
        var contractEntries = JsonConvert.DeserializeObject<List<ContractEntry>>(jsonData);

        // Удаление пробелов из всех полей contractEntries
        contractEntries = contractEntries.Select(RemoveSpacesFromEntry).ToList();

        // Данные за день (первая строка)
        var dailyData = contractEntries[0];

        // Дельта изменений (вторая строка)
        var deltaData = contractEntries[1];

        // Количество лиц (четвёртая строка)
        var peopleData = contractEntries[3];
        try
        {
            // Сохранение данных
            var openPositions = new OpenPosition
            {
                Date = DateTime.ParseExact(dailyData.Date, "dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture),
                JuridicalLong = long.Parse(dailyData.JuridicalLong),
                JuridicalShort = long.Parse(dailyData.JuridicalShort),
                PhysicalLong = long.Parse(dailyData.PhysicalLong),
                PhysicalShort = long.Parse(dailyData.PhysicalShort),

                JuridicalLongDelta = long.Parse(deltaData.JuridicalLong),
                JuridicalShortDelta = long.Parse(deltaData.JuridicalShort),
                PhysicalLongDelta = long.Parse(deltaData.PhysicalLong),
                PhysicalShortDelta = long.Parse(deltaData.PhysicalShort),

                JuridicalLongCount = int.Parse(peopleData.JuridicalLong),
                JuridicalShortCount = int.Parse(peopleData.JuridicalShort),
                PhysicalLongCount = int.Parse(peopleData.PhysicalLong),
                PhysicalShortCount = int.Parse(peopleData.PhysicalShort),

                ContractName = contractName
            };

            _context.OpenPositions.Add(openPositions);

            // Сохранение изменений в БД
            await _context.SaveChangesAsync();
        }
        catch(Exception e)
        {

        }
    }

    // Функция для удаления пробелов в каждой строке данных
    private ContractEntry RemoveSpacesFromEntry(ContractEntry entry)
    {
        return new ContractEntry
        {
            Date = entry.Date?.Trim(),
            JuridicalLong = RemoveInvalidCharacters(entry.JuridicalLong),
            JuridicalShort = RemoveInvalidCharacters(entry.JuridicalShort),
            PhysicalLong = RemoveInvalidCharacters(entry.PhysicalLong),
            PhysicalShort = RemoveInvalidCharacters(entry.PhysicalShort),
            Summary = RemoveInvalidCharacters(entry.Summary) // Если необходимо
        };
    }

    // Функция для удаления всех символов, кроме цифр, запятых, точек и дефисов
    private string RemoveInvalidCharacters(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        // Оставляем только цифры, запятые, точки и дефисы
        //     return Regex.Replace(input, @"[^0-9.,-]", "");
        return Regex.Replace(input, @"[^0-9-]", "");
    }
}
    // Модель данных для парсинга JSON
    public class ContractEntry
{
    public string Date { get; set; }
    public string JuridicalLong { get; set; }
    public string JuridicalShort { get; set; }
    public string PhysicalLong { get; set; }
    public string PhysicalShort { get; set; }
    public string Summary { get; set; }  // Можно игнорировать
}
