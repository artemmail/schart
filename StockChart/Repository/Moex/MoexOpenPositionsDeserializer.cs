using Newtonsoft.Json;

namespace StockChart.Repository.Moex
{
    public static class MoexOpenPositionsDeserializer
    {
        public static List<MoexEnvelope>? Deserialize(Stream jsonStream)
        {
            using var sr = new StreamReader(jsonStream);
            using var jr = new JsonTextReader(sr);

            var serializer = new JsonSerializer();
            return serializer.Deserialize<List<MoexEnvelope>>(jr);
        }
    }
}
