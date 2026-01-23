using System;

/// <summary>
/// Console help output for available modes and options.
/// </summary>
public static class CliHelp
{
    public static void Print(AppMode? mode = null)
    {
        Console.WriteLine("Использование:");
        Console.WriteLine("  sl_par <mode> [options]");
        Console.WriteLine();
        Console.WriteLine("Режимы:");
        Console.WriteLine("  financial        Скачивание финансовых таблиц (data.json + dic.json + data.csv).");
        Console.WriteLine("  report-links     Скачивание ссылок на отчетность (CSV) со страницы /f/l/.");
        Console.WriteLine("  diagrams         Скачивание диаграмм по показателям.");
        Console.WriteLine("  shareholders     Скачивание структуры акционеров.");
        Console.WriteLine("  logos            Скачивание логотипов компаний.");
        Console.WriteLine("  finam            Разбор локальных HTML-файлов Finam.");
        Console.WriteLine("  dividends        Разбор локальных HTML-дивидендов Finam.");
        Console.WriteLine();
        Console.WriteLine("Общие параметры:");
        Console.WriteLine("  --tickers SBER,GAZP     Список тикеров через запятую (по умолчанию все).");
        Console.WriteLine("  --sleep-ms 2000         Задержка между запросами.");
        Console.WriteLine("  --help                  Показать эту справку.");
        Console.WriteLine();

        if (mode.HasValue)
        {
            PrintModeHelp(mode.Value);
        }
        else
        {
            Console.WriteLine("Параметры режима financial:");
            Console.WriteLine("  --report MSFO,RSBU      Отчетность (по умолчанию MSFO,RSBU).");
            Console.WriteLine("  --periods y,q           Периоды (по умолчанию y,q).");
            Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
            Console.WriteLine("  (Если на странице есть блок Reasons Up/Down, сохраняется recomendation.json).");
            Console.WriteLine("  (CSV скачивается для MSFO/RSBU и периодов y,q).");
            Console.WriteLine("  (Ссылки на отчетность сохраняются в report_links/*/links.csv).");
            Console.WriteLine();
            Console.WriteLine("Параметры режима report-links:");
            Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
            Console.WriteLine();
            Console.WriteLine("Параметры режима diagrams:");
            Console.WriteLine("  --report RSBU           Отчетность (по умолчанию RSBU).");
            Console.WriteLine("  --dic-root C:\\...       Папка с dic.json.");
            Console.WriteLine("  --dic-period y          Период для dic.json (по умолчанию y).");
            Console.WriteLine("  --indicators ...        Список показателей (если не указан, читается из dic.json).");
            Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
            Console.WriteLine();
            Console.WriteLine("Параметры режима shareholders:");
            Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
            Console.WriteLine();
            Console.WriteLine("Параметры режима logos:");
            Console.WriteLine("  --format webp|svg       Формат логотипов (по умолчанию webp).");
            Console.WriteLine("  --logos-output C:\\log   Папка вывода.");
            Console.WriteLine();
            Console.WriteLine("Параметры режима finam:");
            Console.WriteLine("  --finam-input C:\\log\\financial   Папка с HTML.");
            Console.WriteLine("  --finam-output C:\\log\\fin        Папка вывода.");
            Console.WriteLine("  --finam-legend C:\\log\\legend.json Путь к легенде.");
            Console.WriteLine("  --finam-table 0         Индекс таблицы.");
            Console.WriteLine();
            Console.WriteLine("Параметры режима dividends:");
            Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
            Console.WriteLine();
        }

        Console.WriteLine("Примеры:");
        Console.WriteLine("  sl_par financial --tickers SBER,GAZP --report MSFO,RSBU --periods y,q");
        Console.WriteLine("  sl_par report-links --tickers SBER --output C:\\zip");
        Console.WriteLine("  sl_par diagrams --tickers SBER --report RSBU --dic-root C:\\stock\\...\\shares");
        Console.WriteLine("  sl_par logos --tickers SBER --format svg --logos-output C:\\log");
        Console.WriteLine("  sl_par finam --finam-input C:\\log\\financial --finam-output C:\\log\\fin");
        Console.WriteLine("  sl_par dividends --tickers SBER,GAZP --output C:\\zip");
    }

    private static void PrintModeHelp(AppMode mode)
    {
        switch (mode)
        {
            case AppMode.Financial:
                Console.WriteLine("Параметры режима financial:");
                Console.WriteLine("  --report MSFO,RSBU      Отчетность (по умолчанию MSFO,RSBU).");
                Console.WriteLine("  --periods y,q           Периоды (по умолчанию y,q).");
                Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
                Console.WriteLine("  (Если на странице есть блок Reasons Up/Down, сохраняется recomendation.json).");
                Console.WriteLine("  (CSV скачивается для MSFO/RSBU и периодов y,q).");
                Console.WriteLine("  (Ссылки на отчетность сохраняются в report_links/*/links.csv).");
                Console.WriteLine();
                break;
            case AppMode.ReportLinks:
                Console.WriteLine("Параметры режима report-links:");
                Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
                Console.WriteLine();
                break;
            case AppMode.Diagrams:
                Console.WriteLine("Параметры режима diagrams:");
                Console.WriteLine("  --report RSBU           Отчетность (по умолчанию RSBU).");
                Console.WriteLine("  --dic-root C:\\...       Папка с dic.json.");
                Console.WriteLine("  --dic-period y          Период для dic.json (по умолчанию y).");
                Console.WriteLine("  --indicators ...        Список показателей (если не указан, читается из dic.json).");
                Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
                Console.WriteLine();
                break;
            case AppMode.Shareholders:
                Console.WriteLine("Параметры режима shareholders:");
                Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
                Console.WriteLine();
                break;
            case AppMode.Logos:
                Console.WriteLine("Параметры режима logos:");
                Console.WriteLine("  --format webp|svg       Формат логотипов (по умолчанию webp).");
                Console.WriteLine("  --logos-output C:\\log   Папка вывода.");
                Console.WriteLine();
                break;
            case AppMode.Finam:
                Console.WriteLine("Параметры режима finam:");
                Console.WriteLine("  --finam-input C:\\log\\financial   Папка с HTML.");
                Console.WriteLine("  --finam-output C:\\log\\fin        Папка вывода.");
                Console.WriteLine("  --finam-legend C:\\log\\legend.json Путь к легенде.");
                Console.WriteLine("  --finam-table 0         Индекс таблицы.");
                Console.WriteLine();
                break;
            case AppMode.Dividends:
                Console.WriteLine("Параметры режима dividends:");
                Console.WriteLine("  --output C:\\zip         Корневая папка вывода.");
                Console.WriteLine();
                break;
        }
    }
}
