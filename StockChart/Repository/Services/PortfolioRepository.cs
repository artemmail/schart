
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using StockProject.PortfolioOptimization;
using SolverMode = StockProject.PortfolioOptimization.PortfolioOptimizationMode;
using SolverRequest = StockProject.PortfolioOptimization.PortfolioOptimizationRequest;
using System.Data;

namespace StockChart.Repository.Services
{
    public class PortfoiloRepository : IPortfoiloRepository
    {
        ICandlesRepository _candlesRepository;
        IStockMarketServiceRepository _stockMarketServiceRepository;
        ITickersRepository _tickers;
        IBillingRepository billingRepository;
        public UserManager<ApplicationUser> UserManager;
        public SignInManager<ApplicationUser> SignInManager;
        public DateTime Date;
        ITopicsRepository topicsRepository;
        IStockMarketServiceRepository service;
        private ApplicationDbContext _dbContext;
        ITickersRepository tikrep;
        private bool? _isUserGameOrdersTableAvailable;
        public PortfoiloRepository(
            ApplicationDbContext dbContext,
               ITickersRepository tikrep,
        SignInManager<ApplicationUser> signInManager,
        UserManager<ApplicationUser> userManager,
        ICandlesRepository candlesRepository,
        IStockMarketServiceRepository service,
        IBillingRepository billingRepository)
        {
            this.tikrep = tikrep;
            this.service = service;
            _dbContext = dbContext;
            this.billingRepository = billingRepository;
            this.UserManager = userManager;
            this.SignInManager = signInManager;
            _candlesRepository = candlesRepository;
        }
        public async Task<UserGameBallance?> GetBallance(Guid UserId, byte portfolio)
        {
            UserGameBallance? ballance =
                await _dbContext.Users
                .Where(x => x.Id == UserId)
                .Include(x => x.UserGameBallances)
                .Select(x => x.UserGameBallances.Where(y => y.PortfolioNumber == portfolio)
                .Select(x => x)
                .FirstOrDefault())
                .FirstOrDefaultAsync();
            if (ballance == null)
            {
                var u = new UserGameBallance()
                {
                    UserId = UserId,
                    Ballance = 10000000,
                    PortfolioNumber = portfolio
                };
                _dbContext.Add(u);
                await _dbContext.SaveChangesAsync();
                ballance = await _dbContext.Users.Where(x => x.Id == UserId)
                .Include(x => x.UserGameBallances)
                .Select(x => x.UserGameBallances.Where(y => y.PortfolioNumber == portfolio).Select(x => x).FirstOrDefault()).FirstOrDefaultAsync();
            }
            return ballance;
        }

        public async Task DepositPortfolio(Guid UserId, byte portfolioNumber, decimal amount)
        {
            if (amount <= 0)
                return;

            var ballance = await GetBallance(UserId, portfolioNumber);
            if (ballance == null)
                return;

            ballance.Ballance += amount;
            _dbContext.Update(ballance);
            await _dbContext.SaveChangesAsync();
        }

        public async Task CleanUpPortfolio(Guid UserId, byte portfolio)
        {
            await EnsureUserGameOrdersAvailabilityAsync();

            List<UserGameShare> res = await _dbContext.UserGameShares
                .Where(x => x.UserId == UserId && x.PortfolioNumber == portfolio)
                .ToListAsync();

            RemoveUserGameShares(res, logOrders: false);
            await RemoveUserGameOrdersAsync(UserId, portfolio);

            UserGameBallance? bal = await _dbContext.UserGameBallances
                .Where(x => x.UserId == UserId && x.PortfolioNumber == portfolio)
                .FirstOrDefaultAsync();

            if (bal != null)
            {
                bal.Ballance = 0;
                _dbContext.Update(bal);
            }

            await _dbContext.SaveChangesAsync();
        }

        private void LogUserGameOrder(Guid userId, byte portfolioNumber, int quantity, decimal price, DateTime? orderTime = null)
        {
            if (quantity == 0)
                return;
            if (_isUserGameOrdersTableAvailable == false)
                return;

            var order = new UserGameOrder()
            {
                UserId = userId,
                PortfolioNumber = portfolioNumber,
                Quantity = quantity,
                Price = price,
                OrderTime = orderTime ?? DateTime.Now
            };

            _dbContext.UserGameOrders.Add(order);
        }

        private void RemoveUserGameShares(IReadOnlyCollection<UserGameShare> shares, bool logOrders)
        {
            if (shares.Count == 0)
                return;

            if (logOrders)
            {
                foreach (var share in shares)
                {
                    if (share.Quantity == 0)
                        continue;

                    LogUserGameOrder(share.UserId, share.PortfolioNumber, -share.Quantity, share.Price);
                }
            }

            _dbContext.UserGameShares.RemoveRange(shares);
        }

        private void AddUserGameShare(UserGameShare share, bool logOrders)
        {
            _dbContext.UserGameShares.Add(share);

            if (logOrders)
                LogUserGameOrder(share.UserId, share.PortfolioNumber, share.Quantity, share.Price);
        }

        private void ApplyOrderToShare(UserGameShare? share, Guid userId, int tickerId, byte portfolioNumber, int quantity, decimal price)
        {
            if (share != null)
            {
                if (share.Quantity + quantity != 0)
                    share.Price = (share.Price * share.Quantity + price * quantity) / (share.Quantity + quantity);

                share.Quantity += quantity;

                if (share.Quantity == 0)
                    _dbContext.UserGameShares.Remove(share);
                else
                    _dbContext.UserGameShares.Update(share);
            }
            else
            {
                var newShare = new UserGameShare()
                {
                    DictionaryId = tickerId,
                    UserId = userId,
                    Price = price,
                    Quantity = quantity,
                    PortfolioNumber = portfolioNumber
                };

                _dbContext.UserGameShares.Add(newShare);
            }

            LogUserGameOrder(userId, portfolioNumber, quantity, price);
        }

        private async Task RemoveUserGameOrdersAsync(Guid userId, byte portfolioNumber)
        {
            if (_isUserGameOrdersTableAvailable == false)
                return;

            try
            {
                var orders = await _dbContext.UserGameOrders
                    .Where(x => x.UserId == userId && x.PortfolioNumber == portfolioNumber)
                    .ToListAsync();

                if (orders.Count == 0)
                    return;

                _dbContext.UserGameOrders.RemoveRange(orders);
            }
            catch (SqlException ex) when (IsMissingUserGameOrdersTable(ex))
            {
                _isUserGameOrdersTableAvailable = false;
                ClearTrackedUserGameOrders();
            }
        }

        public async Task CopyPortfolio(Guid UserId, byte fromportfolio, byte toportfolio)
        {
            await EnsureUserGameOrdersAvailabilityAsync();

            await CleanUpPortfolio(UserId, toportfolio);
            List<UserGameShare> res = await _dbContext.UserGameShares
                .Where(x => x.UserId == UserId && x.PortfolioNumber == fromportfolio)
                .ToListAsync();

            foreach (UserGameShare share in res)
            {
                UserGameShare copy = new UserGameShare()
                {
                    UserId = UserId,
                    DictionaryId = share.DictionaryId,
                    PortfolioNumber = toportfolio,
                    Quantity = share.Quantity,
                    Price = share.Price
                };
                AddUserGameShare(copy, logOrders: true);
            }

            await _dbContext.SaveChangesAsync();

            UserGameBallance balfrom = await GetBallance(UserId, fromportfolio);
            UserGameBallance balto = await GetBallance(UserId, toportfolio);

            balto.Ballance = balfrom.Ballance;
            _dbContext.Update(balto);
            await _dbContext.SaveChangesAsync();
        }

        async Task CreateTempPortfolio(Guid UserId, DateTime portfolioDate, decimal deposit, string[] tickers, double[] values)
        {
            await CleanUpPortfolio(UserId, 0);
            UserGameBallance? balllance = await GetBallance(UserId, 0);
            balllance.Ballance = deposit;
            _dbContext.Update(balllance);
            await _dbContext.SaveChangesAsync();

            for (int i = 0; i < tickers.Length; i++)
            {
                await MakeOrder(UserId, tickers[i], 1, 0, (decimal)((double)deposit * values[i]), null,
                    portfolioDate - TimeSpan.FromDays(10), portfolioDate + TimeSpan.FromDays(1));
            }
        }

        public class PortfolioChartItem
        {
            public string ticker { get; }
            public decimal percent { get; }

            public PortfolioChartItem(string ticker, decimal percent)
            {
                this.ticker = ticker;
                this.percent = percent;
            }
        }

        List<PortfolioChartItem> PortfolioChart(string[] tickers, double[] values)
        {
            var list = new List<PortfolioChartItem>();
            for (int i = 0; i < tickers.Length; i++)
            {
                var v = (decimal)(int)(values[i] * 10000) / 100;
                if (v > 0.2m)
                    list.Add(new PortfolioChartItem(tickers[i], v));
            }

            return list;
        }

        public async Task<List<Portfolio>> GetPortfolio(Guid UserId, byte portfolio)
        {
            await SellExpiredShares(UserId, portfolio);
            await RemoveSharesWithoutCurrentPrice(UserId, portfolio);

            var res = await _dbContext.UserGameShares
                .Where(z => z.UserId == UserId && z.PortfolioNumber == portfolio)
                .Select(y => new
                {
                    TickerId = y.DictionaryId,
                    Quantity = y.Quantity,
                    Price = y.Price,
                    currprice =
                    _dbContext.DayCandles
                    .Where(t => t.Id == y.DictionaryId)
                    .OrderByDescending(u => u.Period)
                    .Select(z => z.ClsPrice).FirstOrDefault()
                }
                ).ToListAsync();


            return res.Select(x =>
                 new StockChart.Model.Portfolio()
                 {
                     ticker = tikrep.TickersById[x.TickerId].Securityid,
                     name = tikrep.TickersById[x.TickerId].Shortname,
                     price = x.Price,
                     currprice = x.currprice,
                     quantity = x.Quantity,
                     buycost = x.Price * x.Quantity,
                     nowcost = x.currprice * x.Quantity,
                     profit = (x.currprice - x.Price) * x.Quantity
                 }
              ).ToList();
        }

        private async Task SellExpiredShares(Guid userId, byte portfolio)
        {
            var today = DateTime.Today;
            var shares = await _dbContext.UserGameShares
                .Where(x => x.UserId == userId && x.PortfolioNumber == portfolio)
                .Select(x => new { x.DictionaryId, x.Quantity })
                .ToListAsync();

            foreach (var share in shares)
            {
                if (share.Quantity == 0)
                    continue;

                if (!tikrep.TickersById.TryGetValue(share.DictionaryId, out var dict))
                    continue;

                if (!dict.ToDate.HasValue || dict.ToDate.Value.Date >= today)
                    continue;

                var expiryPrice = await _dbContext.DayCandles
                    .Where(x => x.Id == share.DictionaryId && x.Period <= dict.ToDate.Value)
                    .OrderByDescending(x => x.Period)
                    .Select(x => x.ClsPrice)
                    .FirstOrDefaultAsync();

                if (expiryPrice <= 0)
                    continue;

                await MakeOrder(userId, dict.Securityid, -share.Quantity, portfolio, price: expiryPrice);
            }
        }

        private async Task RemoveSharesWithoutCurrentPrice(Guid userId, byte portfolio)
        {
            await EnsureUserGameOrdersAvailabilityAsync();

            var shares = await _dbContext.UserGameShares
                .Where(x => x.UserId == userId && x.PortfolioNumber == portfolio)
                .Select(x => new { x.DictionaryId, x.Quantity, x.Price })
                .ToListAsync();

            if (shares.Count == 0)
                return;

            var ids = shares.Select(x => x.DictionaryId).Distinct().ToList();
            var availableIds = await _dbContext.DayCandles
                .Where(x => ids.Contains(x.Id))
                .Select(x => x.Id)
                .Distinct()
                .ToListAsync();

            var availableSet = new HashSet<int>(availableIds);
            var missingShares = shares
                .Where(x => x.Quantity != 0 && !availableSet.Contains(x.DictionaryId))
                .ToList();

            if (missingShares.Count == 0)
                return;

            var missingIds = missingShares.Select(x => x.DictionaryId).Distinct().ToList();
            var shareEntities = await _dbContext.UserGameShares
                .Where(x => x.UserId == userId && x.PortfolioNumber == portfolio && missingIds.Contains(x.DictionaryId))
                .ToListAsync();

            RemoveUserGameShares(shareEntities, logOrders: true);

            var refund = missingShares.Sum(x => x.Price * x.Quantity);
            var ballance = await GetBallance(userId, portfolio);
            ballance.Ballance += refund;
            _dbContext.Update(ballance);

            await _dbContext.SaveChangesAsync();
        }
        public async Task MakeOrder(Guid UserId, string ticker, int quantity, byte PortfolioNumber, decimal? money = null, decimal? price = null)
        {
            await MakeOrder(UserId, ticker, quantity, PortfolioNumber, money, price, DateTime.Now - TimeSpan.FromDays(100), DateTime.Now + TimeSpan.FromDays(7));
        }

        public class PortfolioSolution
        {
            public bool success { get; }
            public decimal actual { get; }
            public decimal stddev { get; }
            public List<PortfolioChartItem> chart { get; }

            public PortfolioSolution(bool success, decimal actual, decimal stddev, List<PortfolioChartItem> chart)
            {
                this.success = success;
                this.actual = actual;
                this.stddev = stddev;
                this.chart = chart;
            }
        }

        class PortfolioOptimizationRawResult
        {
            public string[] tickers { get; }
            public double[] weights { get; }
            public decimal actual { get; }
            public decimal stddev { get; }

            public PortfolioOptimizationRawResult(string[] tickers, double[] weights, decimal actual, decimal stddev)
            {
                this.tickers = tickers;
                this.weights = weights;
                this.actual = actual;
                this.stddev = stddev;
            }
        }

        public List<string> TickersFromString(string s)

        {
            List<string> tickers = new List<string>();
            int period = 1440;
            if (s != null)
            {


                foreach (string v in s.Split(','))
                {
                    string t = v;
                    service.UpdateAlias(ref t);
                    if (tikrep.Tickers.ContainsKey(t.ToUpper()))
                        tickers.Add(t);
                }
            }

            return tickers;
        }

        async Task<PortfolioOptimizationRawResult?> SolvePortfolioOptimization(
            List<string> tickers,
            DateTime startDate,
            DateTime endDate,
            decimal risk,
            PortfolioOptimizationRequestOptions options)
        {
            if (tickers == null || tickers.Count == 0)
                return null;

            if (startDate >= endDate || risk <= 0)
                return null;

            int period = 1440;
            List<List<Candle>> candlesByTicker = new List<List<Candle>>();
            List<string> validTickers = new List<string>();
            HashSet<string> seenTickers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var ticker in tickers)
            {
                if (string.IsNullOrWhiteSpace(ticker))
                    continue;

                if (!seenTickers.Add(ticker))
                    continue;

                var candles = await _candlesRepository.GetCandles(ticker, period, startDate, endDate, 20000);
                if (candles == null || candles.Count < 2)
                    continue;

                candlesByTicker.Add(candles);
                validTickers.Add(ticker);
            }

            if (validTickers.Count == 0)
                return null;

            var names = validTickers.ToArray();
            var normalizedOptions = NormalizeRequestOptions(options);
            if (!HasValidRequestOptions(names.Length, normalizedOptions))
                return null;

            var solverRequest = new SolverRequest
            {
                Mode = ToSolverMode(normalizedOptions.Mode),
                RiskParameter = (double)(risk / 1000m),
                RiskFreeRate = (double)(normalizedOptions.RiskFreeRate / 1000m),
                MinWeight = (double)(normalizedOptions.MinWeight ?? 0m),
                MaxWeight = (double)(normalizedOptions.MaxWeight ?? 1m),
                AssetSectorIds = ResolveAssetSectors(names),
                SectorMaxWeights = ToDoubleSectorLimits(normalizedOptions.SectorMaxWeights),
            };

            PortfolioOptimizationResult? solved;
            MarkowitzPortfolioAccord qp = new MarkowitzPortfolioAccord();
            qp.StockNames = names;
            solved = qp.BuildCovariance(candlesByTicker, solverRequest);

            if (solved == null || solved.Mas == null || solved.Mas.Length != validTickers.Count)
                return null;

            return new PortfolioOptimizationRawResult(
                names,
                solved.Mas,
                (decimal)(solved.Actual * 1000),
                (decimal)(solved.StdDev * 1000));
        }

        static PortfolioOptimizationRequestOptions NormalizeRequestOptions(PortfolioOptimizationRequestOptions? options)
        {
            if (options == null)
                return new PortfolioOptimizationRequestOptions();

            return new PortfolioOptimizationRequestOptions
            {
                Mode = options.Mode,
                RiskFreeRate = options.RiskFreeRate,
                MinWeight = options.MinWeight,
                MaxWeight = options.MaxWeight,
                SectorMaxWeights = options.SectorMaxWeights ?? new Dictionary<int, decimal>(),
            };
        }

        static bool HasValidRequestOptions(int assetCount, PortfolioOptimizationRequestOptions options)
        {
            if (assetCount <= 0)
                return false;

            var minWeight = options.MinWeight ?? 0m;
            var maxWeight = options.MaxWeight ?? 1m;
            if (minWeight < 0m || maxWeight > 1m || minWeight > maxWeight)
                return false;
            if (minWeight * assetCount > 1m || maxWeight * assetCount < 1m)
                return false;

            if (options.SectorMaxWeights != null)
            {
                foreach (var kv in options.SectorMaxWeights)
                {
                    if (kv.Value <= 0m || kv.Value > 1m)
                        return false;
                }
            }

            return true;
        }

        int?[] ResolveAssetSectors(string[] tickers)
        {
            var sectors = new int?[tickers.Length];
            for (int i = 0; i < tickers.Length; i++)
            {
                var key = tickers[i].ToUpperInvariant();
                if (tikrep.Tickers.TryGetValue(key, out var dic))
                    sectors[i] = dic.CategoryTypeId;
            }

            return sectors;
        }

        static IReadOnlyDictionary<int, double> ToDoubleSectorLimits(IReadOnlyDictionary<int, decimal>? limits)
        {
            if (limits == null || limits.Count == 0)
                return new Dictionary<int, double>();

            return limits.ToDictionary(kv => kv.Key, kv => (double)kv.Value);
        }

        static SolverMode ToSolverMode(PortfolioOptimizationMode mode)
        {
            return mode switch
            {
                PortfolioOptimizationMode.MaxReturn => SolverMode.MaxReturn,
                PortfolioOptimizationMode.MaxSharpe => SolverMode.MaxSharpe,
                _ => SolverMode.MinVariance,
            };
        }

        PortfolioSolution EmptyPortfolioSolution()
        {
            return new PortfolioSolution(false, 0, 0, new List<PortfolioChartItem>());
        }

        public async Task<PortfolioSolution> PortfolioOptimizationSolv(Guid UserId, List<string> tickers, DateTime startDate, DateTime endDate, DateTime portfolioDate, decimal deposit, decimal risk)
        {
            return await PortfolioOptimizationSolv(
                UserId,
                tickers,
                startDate,
                endDate,
                portfolioDate,
                deposit,
                risk,
                new PortfolioOptimizationRequestOptions());
        }

        public async Task<PortfolioSolution> PortfolioOptimizationSolv(
            Guid UserId,
            List<string> tickers,
            DateTime startDate,
            DateTime endDate,
            DateTime portfolioDate,
            decimal deposit,
            decimal risk,
            PortfolioOptimizationRequestOptions options)
        {
            var solved = await SolvePortfolioOptimization(tickers, startDate, endDate, risk, options);
            if (solved == null)
                return EmptyPortfolioSolution();

            await CreateTempPortfolio(UserId, portfolioDate, deposit, solved.tickers, solved.weights);
            return new PortfolioSolution(true, solved.actual, solved.stddev, PortfolioChart(solved.tickers, solved.weights));
        }

        List<PortfolioChartItem> PortfolioChartFull(string[] tickers, double[] values)
        {
            var list = new List<PortfolioChartItem>();
            for (int i = 0; i < tickers.Length; i++)
            {
                var v = Math.Round((decimal)values[i] * 100, 4, MidpointRounding.AwayFromZero);
                list.Add(new PortfolioChartItem(tickers[i], v));
            }

            return list;
        }

        public async Task<PortfolioSolution> PortfolioOptimizationPreview(List<string> tickers, DateTime startDate, DateTime endDate, decimal risk)
        {
            return await PortfolioOptimizationPreview(tickers, startDate, endDate, risk, new PortfolioOptimizationRequestOptions());
        }

        public async Task<PortfolioSolution> PortfolioOptimizationPreview(List<string> tickers, DateTime startDate, DateTime endDate, decimal risk, PortfolioOptimizationRequestOptions options)
        {
            var solved = await SolvePortfolioOptimization(tickers, startDate, endDate, risk, options);
            if (solved == null)
                return EmptyPortfolioSolution();

            return new PortfolioSolution(true, solved.actual, solved.stddev, PortfolioChartFull(solved.tickers, solved.weights));
        }

        public async Task MakeOrder(Guid UserId, string ticker, int quantity, byte PortfolioNumber, decimal? money, decimal? price, DateTime from, DateTime to)
        {
            await EnsureUserGameOrdersAvailabilityAsync();

            service.UpdateAlias(ref ticker);
            int tickerid = tikrep[ticker].Id;
            if (!price.HasValue)
            {
                price = await service.GetLastPriceAsync(ticker, from, to);
                if (price == 1)
                    return;
            }
            if (money.HasValue)
            {
                if (price == 0)
                    return;
                quantity = (int)(money.Value / price);
                if (quantity == 0)
                    return;
            }

            var ballance = await GetBallance(UserId, PortfolioNumber);
            var share = await _dbContext.UserGameShares
                .Where(x => x.UserId == UserId && x.PortfolioNumber == PortfolioNumber && x.DictionaryId == tickerid)
                .FirstOrDefaultAsync();

            ApplyOrderToShare(share, UserId, tickerid, PortfolioNumber, quantity, price.Value);
            ballance.Ballance -= price.Value * quantity;
            _dbContext.Update(ballance);

            await _dbContext.SaveChangesAsync();
        }

        private async Task EnsureUserGameOrdersAvailabilityAsync()
        {
            if (_isUserGameOrdersTableAvailable.HasValue)
                return;

            try
            {
                await _dbContext.UserGameOrders
                    .AsNoTracking()
                    .Take(1)
                    .ToListAsync();

                _isUserGameOrdersTableAvailable = true;
            }
            catch (SqlException ex) when (IsMissingUserGameOrdersTable(ex))
            {
                _isUserGameOrdersTableAvailable = false;
                ClearTrackedUserGameOrders();
            }
        }

        private static bool IsMissingUserGameOrdersTable(SqlException ex)
        {
            return ex.Number == 208 &&
                ex.Message.Contains("UserGameOrder", StringComparison.OrdinalIgnoreCase);
        }

        private void ClearTrackedUserGameOrders()
        {
            var trackedOrders = _dbContext.ChangeTracker.Entries<UserGameOrder>().ToList();
            foreach (var entry in trackedOrders)
                entry.State = EntityState.Detached;
        }


    }
}

