using System;
using System.Collections.Generic;
using System.Linq;

namespace DataProvider.Services
{
    public class MarketInfo
    {
        public byte MarketId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public interface IMarketInfoService
    {
        IReadOnlyDictionary<string, MarketInfo> GetMarkets();
        bool TryGetMarket(string marketCode, out MarketInfo marketInfo);
    }

    public class MarketInfoService : IMarketInfoService
    {
        private readonly IReadOnlyDictionary<string, MarketInfo> _markets;

        public MarketInfoService()
        {
            var markets = SQLHelper.ConvertDataTable<MarketInfo>(SQLHelper.DataTableFromQuery("select MarketId, Name from class"));
            _markets = markets.ToDictionary(x => x.Name, x => x);
        }

        public IReadOnlyDictionary<string, MarketInfo> GetMarkets() => _markets;

        public bool TryGetMarket(string marketCode, out MarketInfo marketInfo)
        {
            if (string.IsNullOrWhiteSpace(marketCode))
            {
                marketInfo = null;
                return false;
            }

            return _markets.TryGetValue(marketCode, out marketInfo);
        }
    }

    public static class MarketInfoServiceHolder
    {
        private static Lazy<IMarketInfoService> _marketInfoService = new(() => new MarketInfoService());

        public static void Configure(IMarketInfoService marketInfoService)
        {
            _marketInfoService = new Lazy<IMarketInfoService>(() => marketInfoService ?? throw new ArgumentNullException(nameof(marketInfoService)));
        }

        public static bool TryGetMarket(string marketCode, out MarketInfo marketInfo)
        {
            var marketService = _marketInfoService.Value;
            return marketService.TryGetMarket(marketCode, out marketInfo);
        }
    }
}
