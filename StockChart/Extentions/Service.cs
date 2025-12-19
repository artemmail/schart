using Microsoft.AspNetCore.Mvc.Rendering;
namespace StockChart.Extentions
{
    public static class Service
    {
        public static readonly int[] _BigPeriods = new int[] { 7, 14, 30, 90, 180, 365 };
        public static readonly int[] _SmallPeriods = new int[] { 1, 3, 7, 14, 30 };
        public static void init_big_small_periods(ref string bigPeriod, ref string smallPeriod)
        {
            if (string.IsNullOrEmpty(bigPeriod))
                bigPeriod = _BigPeriods[0].ToString();
            if (string.IsNullOrEmpty(smallPeriod))
                smallPeriod = _SmallPeriods[0].ToString();
            int iBigPeriod = int.Parse(bigPeriod);
            if (int.Parse(smallPeriod) >= iBigPeriod)
            {
                for (int i = _SmallPeriods.Length - 1; i >= 0; i--)
                {
                    smallPeriod = _SmallPeriods[i].ToString();
                    if (_SmallPeriods[i] < iBigPeriod)
                        break;
                }
            }
        }
        public static string get_num_days_name(int numDays)
        {
            switch (numDays)
            {
                case 7:
                    return "неделя";
                case 14:
                    return "2 недели";
                case 30:
                    return "месяц";
                case 90:
                    return "квартал";
                case 180:
                    return "полгода";
                case 365:
                    return "год";
                default:
                    {
                        string suff;
                        int lastDig = numDays % 10;
                        if (lastDig == 1)
                            suff = " день";
                        else if (lastDig == 1)
                            suff = " день";
                        else if (lastDig >= 2 && lastDig <= 4)
                            suff = " дня";
                        else
                            suff = " дней";
                        return numDays.ToString() + suff;
                    }
            }
        }
        public static string num_days_to_rperiod(int numDays)
        {
            if (numDays <= 7)
                return "week";
            if (numDays <= 30)
                return "month";
            return "quarter";
        }
        public static string rperiod_to_period(string rperiod)
        {
            if (rperiod == "week")
                return "60";
            return "1440";
        }
        public static List<SelectListItem> num_days_to_seleclistItems(string selected_num_days, IList<int> numDaysList)
        {
            List<SelectListItem> res = new List<SelectListItem>();
            foreach (int num in numDaysList)
            {
                SelectListItem item = new SelectListItem();
                item.Text = get_num_days_name(num);
                item.Value = num.ToString();
                item.Selected = item.Value == selected_num_days;
                res.Add(item);
            }
            return res;
        }
        public static List<SelectListItem> years_list(int first = 2000)
        {
            List<SelectListItem> res = new List<SelectListItem>();
            for (int y = DateTime.Now.Year; y >= first; y--)
            {
                SelectListItem item = new SelectListItem();
                item.Text = y.ToString();
                item.Value = y.ToString();
                item.Selected = (y == DateTime.Now.Year);
                res.Add(item);
            }
            return res;
        }




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

        public struct OptionItem<T>
        {
            public T Value;
            public string Text;
            public OptionItem(T Value, string Text)
            {
                this.Value = Value;
                this.Text = Text;
            }
        };
        public class OptionsItems<T> : List<OptionItem<T>>
        {
            public void Add(T Value, string Text)
            {
                Add(new OptionItem<T>(Value, Text));
            }
            public List<SelectListItem> GetSelectedList(T selected)
            {
                var res = new List<SelectListItem>();
                foreach (var val in this)
                    res.Add(new SelectListItem { Text = val.Text, Value = val.Value.ToString(), Selected = val.Value.Equals(selected) });
                return res;
            }
        }
        public static readonly OptionsItems<decimal> CandlePeriods = new OptionsItems<decimal> {
            { 0, "Тиковый"},  { 3, "Трейды"},{0.25m/3,"5 сек" } , {0.25m,"15 сек" } , {0.5m,"30 сек" } , {1, "1 мин"},{5, "5 мин"},{10, "10 мин"},{15, "15 мин"},{30, "30 мин"},
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
        public static int get_closest_period(OptionsItems<int> list, int minuties)
        {
            for (int i = list.Count - 1; i >= 0; i--)
                if (minuties >= list[i].Value)
                    return list[i].Value;
            return 1;
        }
    }
}
