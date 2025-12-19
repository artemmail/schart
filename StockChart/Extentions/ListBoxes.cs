namespace StockChart.Extentions
{
    public static class ListBoxes
    {
        public static int initPreferedPeriod(string type, TimeSpan duration)
        {
            if (type == "Candles")
            {
                if (duration.TotalDays <= 2)
                    return 1;
                else if (duration.TotalDays <= 5)
                    return 5;
                else if (duration.TotalDays <= 7)
                    return 15;
                else if (duration.TotalDays <= 14)
                    return 30;
                else if (duration.TotalDays <= 31)
                    return 60;
                else if (duration.TotalDays <= 183)
                    return 1440;
                else if (duration.TotalDays <= 366)
                    return 1440 * 7;
                else
                    return 30000;
            }
            if (type == "Candles2")
            {
                if (duration.TotalDays <= 1)
                {
                    if (DateTime.Now.Hour < 10)
                        return 15;
                    if (DateTime.Now.Hour < 11)
                        return 1;
                    if (DateTime.Now.Hour < 14)
                        return 5;
                    return 15;
                }
                else if (duration.TotalDays <= 7)
                    return 60;
                else if (duration.TotalDays <= 92)
                    return 1440;
                else if (duration.TotalDays <= 366)
                    return 1440 * 7;
                else
                    return 30000;
            }
            else
            {
                if (duration.TotalDays <= 1)
                    return 15;
                if (duration.TotalDays <= 2)
                    return 30;
                else if (duration.TotalDays <= 7)
                    return 240;
                else
                    return 1440;
            }
        }
        public static DateTimePair DatesFromRperiod(DateTime lastDate, string rperiod)
        {
            switch (rperiod)
            {
                case "day":
                    return new DateTimePair(lastDate, lastDate);
                case "week":
                    return new DateTimePair(lastDate - TimeSpan.FromDays(6), lastDate);
                case "month":
                    return new DateTimePair(lastDate - TimeSpan.FromDays(30), lastDate);
                case "quarter":
                    return new DateTimePair(lastDate - TimeSpan.FromDays(91), lastDate);
                case "halfyear":
                    return new DateTimePair(lastDate - TimeSpan.FromDays(182), lastDate);
                case "year":
                    return new DateTimePair(lastDate - TimeSpan.FromDays(365), lastDate);
                case "prevyear":
                    return new DateTimePair(
                        new DateTime(DateTime.Now.Year - 1, 1, 1),
                        new DateTime(DateTime.Now.Year, 1, 1));
                case "startyear":
                    return new DateTimePair(
                        new DateTime(lastDate.Year, 1, 1),
                        lastDate);
                case "all":
                    return new DateTimePair(
                        new DateTime(2000, 1, 1),
                        lastDate);
            }
            return new DateTimePair(lastDate - TimeSpan.FromDays(6), lastDate);
        }
        public static decimal PeriodByDefault(string rperiod, decimal? period)
        {
            Dictionary<string, int> dict = new Dictionary<string, int>() { { "day", 1 }, { "week", 15 }, { "month", 60 }, { "quarter", 60 }, { "halfyear", 1440 }, { "year", 1440 }, { "all", 30000 } };
            if (period != null)
                return period.Value;
            if (dict.ContainsKey(rperiod))
                return dict[rperiod];
            return 1440;
        }
        public static readonly OptionsItems<double> CandlePeriods = new OptionsItems<double> {
            { 0, "Тиковый"}, { 3, "Трейды"}, {0.25f/3,"5 сек" } , {0.25f,"15 сек" } , {0.5f,"30 сек" } , {1, "1 мин"},{5, "5 мин"},{10, "10 мин"},{15, "15 мин"},{30, "30 мин"},
            {60, "1 час"}, {120, "2 часа"}, {240, "4 часа"}, {1440, "1 день"},{1440*7, "неделя"},{30000, "месяц"},    {90000, "Квартал"},{180000, "6 мес."},
        };
        /* public static readonly OptionsItems<int> ClusterPeriods = new OptionsItems<int> { 
             {1, "1 мин"},{5, "5 мин"},{15, "15 мин"},{30, "30 мин"},
             {60, "1 час"}, {120, "2 часа"}, {240, "4 часа"}, {1440, "1 день"},{1440*7, "неделя"}
         };*/
        public static readonly OptionsItems<int> MultiPeriods = new OptionsItems<int> {
           {1, "1 мин"},{5, "5 мин"},{15, "15 мин"},{30, "30 мин"},
            {60, "1 час"}, {120, "2 часа"}, {240, "4 часа"}, {1440, "1 день"},{1440*7, "неделя"},{30000, "месяц"}
        };
        public static readonly OptionsItems<string> ReportPeriods = new OptionsItems<string> {
            {"custom", "Свой промежуток"}, {"day", "День"},{"week", "Неделя"},  {"month", "Месяц"}, {"quarter", "Квартал"},
            {"halfyear", "Полгода"},    {"year", "Год"},    {"prevyear", "Прошлый год"},    {"startyear", "Начало года"},    {"all", "Весь период"}
        };
        public static readonly OptionsItems<int> PortfolioItems = new OptionsItems<int> {
           {1,"Портфель #1"},{2,"Портфель #2"},{3,"Портфель #3"},{4,"Портфель #4"}
        };
        public static readonly OptionsItems<int> TopLeaders = new OptionsItems<int> {
           {10,"Топ 10"},{20,"Топ 20"},{50,"Топ 50"},{100,"Топ 100"},{1000,"Все"}
        };
        public static readonly OptionsItems<string> MarketLeadersReports = new OptionsItems<string> {
            {"VolumeLeaderBittrex", "Лидеры BitTrex"},
            {"VolumeLeader", "Лидеры объемов"},
            {"GrowLeader", "Лидеры роста"},
            {"FallLeader", "Лидеры падения"},
            {"BidLeader", "Лидеры сделок BID"},
            {"AskLeader", "Лидеры сделок ASK"}
        };
    }
}
