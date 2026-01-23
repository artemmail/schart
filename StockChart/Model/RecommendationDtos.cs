namespace StockChart.Model
{
    public class RecommendationDto
    {
        public List<string> ReasonsUp { get; set; } = new();
        public List<string> ReasonsDown { get; set; } = new();
    }
}
