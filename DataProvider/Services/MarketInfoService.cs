using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using StockChart.Data;

namespace DataProvider.Services
{
    public class TickerDIC
    {
        public int market;
        public int id;
        public int lotsize;
    }

    public class MarketInfo
    {
        public byte MarketId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public interface IMarketInfoService
    {
        IReadOnlyDictionary<string, MarketInfo> GetMarkets();
        bool TryGetMarket(string marketCode, out MarketInfo marketInfo);
        IReadOnlyDictionary<string, TickerDIC> GetTickers();
        bool TryGetTicker(string ticker, out TickerDIC tickerInfo);
        void RefreshTickers();
    }

    public class MarketInfoService : IMarketInfoService
    {
        private readonly IReadOnlyDictionary<string, MarketInfo> _markets;
        private ConcurrentDictionary<string, TickerDIC> _tickerDictionary;

        public MarketInfoService()
        {
            using var context = DatabaseContextFactory.CreateStockProcContext(SQLHelper.ConnectionString);
            var markets = context.Classes
                .AsNoTracking()
                .Select(x => new MarketInfo
                {
                    MarketId = x.MarketId,
                    Name = x.Name
                })
                .ToList();

            _markets = markets.ToDictionary(x => x.Name, x => x);
            _tickerDictionary = LoadTickers();
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

        public IReadOnlyDictionary<string, TickerDIC> GetTickers() => _tickerDictionary;

        public bool TryGetTicker(string ticker, out TickerDIC tickerInfo)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                tickerInfo = null;
                return false;
            }

            return _tickerDictionary.TryGetValue(ticker, out tickerInfo);
        }

        public void RefreshTickers()
        {
            _tickerDictionary = LoadTickers();
        }

        private ConcurrentDictionary<string, TickerDIC> LoadTickers()
        {
            using var context = DatabaseContextFactory.CreateStockProcContext(SQLHelper.ConnectionString);
            var tickerList = context.Dictionaries
                .AsNoTracking()
                .Select(x => new
                {
                    x.Securityid,
                    x.Market,
                    x.Id,
                    x.Lotsize
                })
                .Where(x => !string.IsNullOrWhiteSpace(x.Securityid))
                .ToList();

            var tickerDictionary = new ConcurrentDictionary<string, TickerDIC>();

            foreach (var ticker in tickerList)
            {
                var mappedTicker = new TickerDIC
                {
                    market = ticker.Market ?? 0,
                    id = ticker.Id,
                    lotsize = ticker.Lotsize ?? 0
                };

                tickerDictionary[ticker.Securityid!] = mappedTicker;
            }

            return tickerDictionary;
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

        public static IReadOnlyDictionary<string, TickerDIC> GetTickers()
        {
            return _marketInfoService.Value.GetTickers();
        }

        public static bool TryGetTicker(string ticker, out TickerDIC tickerInfo)
        {
            var marketService = _marketInfoService.Value;
            return marketService.TryGetTicker(ticker, out tickerInfo);
        }

        public static void RefreshTickers()
        {
            _marketInfoService.Value.RefreshTickers();
        }
    }
}
