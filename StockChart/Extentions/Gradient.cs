namespace StockChart.Extentions
{
    public static class Gradient
    {
        private static int GradientChannel(int start, int finish, double percent)
        {
            if (percent < 0)
                percent = 0;
            if (percent > 1)
                percent = 1;
            return (int)Math.Round(start + (finish - start) * percent);
        }
        private static double vec(decimal min, decimal max, decimal val)
        {
            if (val < min)
                val = min;
            if (val > max)
                val = max;
            return (double)(val - min) / (double)(max - min);
        }
        private static string GradientColor(int R1, int G1, int B1, int R2, int G2, int B2, decimal min, decimal max, decimal val)
        {
            var v = vec(min, max, val);
            int R = GradientChannel(R1, R2, v);
            int G = GradientChannel(G1, G2, v);
            int B = GradientChannel(B1, B2, v);
            //return string.Format("rgba({0}, {1}, {2}, 1)", R, G, B);
            return string.Format("#{0}{1}{2}", R.ToString("X2"), G.ToString("X2"), B.ToString("X2"));
        }
        public static string GradientColorY(decimal max, decimal val, int colorModel)
        {
            if (colorModel == 0)
                return (val > 0) ? GradientColor(0, 0, 0, 4, 163, 68, 0, max, val) : GradientColor(0, 0, 0, 214, 24, 0, 0, max, -val);
            return (val > 0) ? GradientColor(192, 192, 192, 107, 165, 131, 0, max, val) : GradientColor(192, 192, 192, 215, 84, 66, 0, max, -val);
        }
    }
}
