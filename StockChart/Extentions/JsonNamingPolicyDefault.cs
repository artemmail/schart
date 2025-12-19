namespace StockChart.Extentions
{
    class JsonNamingPolicyDefault : System.Text.Json.JsonNamingPolicy
    {
        /// <summary>
        /// Initializes a new instance of <see cref="JsonNamingPolicy"/>.
        /// </summary>
        public JsonNamingPolicyDefault() : base() { }
        public override string ConvertName(string name)
        {
            return name;
        }
    }
}