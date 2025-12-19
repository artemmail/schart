
using StockChart.Model;
namespace StockProject.MemCache
{
    public class BarometerCalculator
    {
        List<Candle> m_list;
        public BarometerCalculator()
        {

        }
        string ticker;
        int period;
        private double A(int size, int i)
        {
            decimal C = m_list[i - size].ClsPrice;
            decimal maxh = m_list[i].MaxPrice;
            decimal minl = m_list[i].MinPrice;
            for (int j = 0; j < size; j++)
            {
                maxh = Math.Max(maxh, m_list[i - j].MaxPrice);
                minl = Math.Min(minl, m_list[i - j].MinPrice);
            }
            return (double)(Math.Max(maxh, C) - Math.Min(minl, C));
        }
        private double D(int size, int i)
        {
            decimal C = m_list[i].ClsPrice;
            decimal maxh = m_list[i].MaxPrice;
            decimal minl = m_list[i].MinPrice;
            for (int j = 0; j < size; j++)
            {
                maxh = Math.Max(maxh, m_list[i - j].MaxPrice);
                minl = Math.Min(minl, m_list[i - j].MinPrice);
            }
            return (double)(C - 0.5m * (maxh + minl) / (maxh - minl));
        }
        private double Down(int size, int i)
        {
            decimal C = m_list[i].ClsPrice;
            decimal maxh = m_list[i].MaxPrice;
            decimal minl = m_list[i].MinPrice;
            for (int j = 0; j < size; j++)
            {
                maxh = Math.Max(maxh, m_list[i - j].MaxPrice);
                minl = Math.Min(minl, m_list[i - j].MinPrice);
            }
            return (double)((C - minl) / (maxh - minl));
        }
        private double mu(int size, int i)
        {
            double s21 = Math.Log(A(size / 2, i) + A(size / 2, i - size / 2));
            double s4 = Math.Log(A(size, i));
            return (s21 - s4) / (Math.Log(size) - Math.Log(size / 2));
        }
        private double Buser(int size, int i)
        {
            double d = D(size, i);
            double m = mu(size, i);
            if (d > 0)
                return (m < 0.5) ? 1 - m : m;
            else
                return (m < 0.5) ? m : 1 - m;
        }
        private double F(int size, int i)
        {
            return (Buser(size, i) * Down(size, i) - (1 - Buser(size, i)) * (1 - Down(size, i))) * (A(size, i) / A(size, i - size));
        }
        public int lastindex()
        {
            return m_list.Count - 1;
        }
        public decimal lastprice()
        {
            return m_list[m_list.Count - 1].ClsPrice;
        }
        public double final(int i)
        {
            //   int i = m_list.Count - 1;
            return F(2, i) + 1.41 * F(4, i) + 2 * F(8, i) + 2.8 * F(16, i);
        }

        static Dictionary<int, string> recstr = new Dictionary<int, string>() {
            { 3, "лонг открыть" }, { 2, "лонг держать" }, { 1, "лонг открыть" },
            { 0, "флэт" }, { -1, "шорт сократить" }, { -2, "шорт держать" }, { -3, "шорт открыть" } };


        public int RecommendationInt(List<Candle> o)
        {

            m_list = o;
            try
            {
                var a1 = final(lastindex() - 1);
                var a2 = final(lastindex());
                /*     if (SQLHelper.LastTradingDate(0).Day==DateTime.Now.Day)
                     {
                         a1--;
                         a2--;
                     }*/
                if ((a1 < 0) && (a2 > 0))
                    return 3;
                if ((a1 > 0) & (a2 > a1))
                    return 2;
                if ((a2 < a1) & (a2 > 0))
                    return 1;
                if ((a1 > 0) && (a2 < 0))
                    return -3;
                if ((a2 < a1) && (a1 < 0))
                    return -2;
                if ((a2 > a1) && (a2 < 0))
                    return -1;
            }
            catch
            {
            }
            return 0;
            /*
                 Если предыдущий индикатор меньше нуля и текущий больше нуля - лонг открыть
            Если предыдущий индикатор больше нуля и текущий больше предыдущего -
            лонг держать
            Если текущий индикатор больше нуля и текущий меньше предыдущего - лонг сократить
            Если предыдущий индикатор больше нуля и текущий меньше нуля - шорт открыть
            Если предыдущий индикатор меньше нуля и текущий меньше предыдущего -
            шорт держать
            Если текущий индикатор меньше нуля и текущий больше предыдущего - шорт сократить           
              */
        }

        public string Recommendation(List<Candle> o)
        {
            var r = RecommendationInt(o);
            return recstr[r];
        }



    }
}