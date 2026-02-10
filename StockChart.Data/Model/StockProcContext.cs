using Microsoft.Data.SqlClient;

using Microsoft.EntityFrameworkCore;



using System.Data;
using StockChart.EventBus.Models;

namespace StockChart.Model;


public partial class ApplicationDbContext

{

    private DbSet<AliasResult> Alias { get; set; }    

    private DbSet<candleseekerResult> VolumeSplash { get; set; }

    private DbSet<Candle> GetCandles { get; set; }

    private DbSet<Candle> GetLastCandles { get; set; }

    private DbSet<ClusterProfileNewResult> ClusterProfileNew { get; set; }

    private DbSet<ClusterProfileResult> ClusterProfile { get; set; }    

    private DbSet<LastTradingDateProcResult> LastTradingDateProc { get; set; }    

    private DbSet<MarketMapPeriod4Result> MarketMapPeriod4 { get; set; }    

    private DbSet<tickersResult> tickers { get; set; }

    private DbSet<tickersdatesResult> tickersdates { get; set; }

    private DbSet<TopOrdersResult> TopOrders { get; set; }    

    private DbSet<VolumeSearchResult> VolumeSearch { get; set; }

    private DbSet<MissingIntervalWithTrades> MissingIntervalsWithTrades { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AliasResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<candleseekerResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<ClusterProfileNewResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<ClusterProfileResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<LastTradingDateProcResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<MarketMapPeriod4Result>().HasNoKey().ToView(null);
        modelBuilder.Entity<MicexVolYearResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<tickersResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<tickersdatesResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<TopOrdersResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<VolumeSearchResult>().HasNoKey().ToView(null);
        modelBuilder.Entity<MissingIntervalWithTrades>().HasNoKey().ToView(null);
    }







    public List<MissingIntervalWithTrades> GetMissingIntervalsWithTrades(int specificId, DateTime startPeriod, DateTime endPeriod)

    {

        var parameters = new[]

        {

            new SqlParameter("@SpecificID", SqlDbType.Int) { Value = specificId },

            new SqlParameter("@StartPeriod", SqlDbType.DateTime) { Value = startPeriod },

            new SqlParameter("@EndPeriod", SqlDbType.DateTime) { Value = endPeriod }

        };



        return Database

            .SqlQueryRaw<MissingIntervalWithTrades>("EXEC sp_GetMissingTrades2 @SpecificID, @StartPeriod, @EndPeriod", parameters)

            .ToList();

    }





    public async Task<List<AliasResult>> AliasAsync(string ticker)

    {
        return await AliasLocalEfAsync(ticker);

    }





   

    public async Task<List<candleseekerResult>> VolumeSplashAsync(int bigPeriod, int smallPeriod, byte market, double splash)

    {

        return await VolumeSplashLocalEfAsync(bigPeriod, smallPeriod, market, splash);

    }

    public async Task<List<candleseekerResult>> VolumeSplashProcAsync(int bigPeriod, int smallPeriod, byte market, double splash)

    {

        if (!Database.IsSqlServer())
            throw new NotSupportedException("VolumeSplashProcAsync requires SQL Server provider.");

        SqlParameter p_bigPeriod = new SqlParameter("@bigPeriod", bigPeriod);
        SqlParameter p_smallPeriod = new SqlParameter("@smallPeriod", smallPeriod);
        SqlParameter p_market = new SqlParameter("@market", market);
        SqlParameter p_splash = new SqlParameter("@splash", splash);

        const string sqlQuery = @"EXEC [dbo].[VolumeSplash] @bigPeriod, @smallPeriod, @market, @splash";

        return await VolumeSplash.FromSqlRaw(sqlQuery, p_bigPeriod, p_smallPeriod, p_market, p_splash)
            .AsNoTracking()
            .ToListAsync();

    }

   

    public async Task<List<Candle>> GetCandlesGluedAsync(string ticker, int? period, DateTime? startDate, DateTime? endDate, int? top)

    {

        if (string.IsNullOrWhiteSpace(ticker) || !period.HasValue || !startDate.HasValue || !endDate.HasValue)

        {

            return new List<Candle>();

        }

        return await GetCandlesGluedLocalEfAsync(ticker, period.Value, startDate.Value, endDate.Value, top ?? 50000);

    }

    public async Task<List<Candle>> GetCandlesAsync(string ticker, double period, DateTime startDate, DateTime endDate, int? top)

    {

        var resolved = await ResolveTickerIdAndMarketAsync(ticker);

        if (!resolved.HasValue)

        {

            return new List<Candle>();

        }

        return await GetCandlesNewLocalEfAsync(

            resolved.Value.Id,

            resolved.Value.Market,

            period,

            startDate,

            endDate,

            top ?? 50000);

    }

    public async Task<List<Candle>> GetCandlesProcAsync(string ticker, double period, DateTime startDate, DateTime endDate, int? top)

    {

        if (string.IsNullOrWhiteSpace(ticker))
            return new List<Candle>();

        if (!Database.IsSqlServer())
            throw new NotSupportedException("GetCandlesProcAsync requires SQL Server provider.");

        SqlParameter p_ticker = new SqlParameter("@ticker", ticker);
        SqlParameter p_period = new SqlParameter("@period", period);
        SqlParameter p_startDate = new SqlParameter("@startDate", startDate);
        SqlParameter p_endDate = new SqlParameter("@endDate", endDate);
        SqlParameter p_top = new SqlParameter("@top", top ?? 50000);

        const string sqlQuery = @"
DECLARE @t TABLE (
    RoundDate datetime NOT NULL,
    OpnPrice decimal(28,10) NOT NULL,
    ClsPrice decimal(28,10) NOT NULL,
    MinPrice decimal(28,10) NOT NULL,
    MaxPrice decimal(28,10) NOT NULL,
    Volume decimal(28,10) NOT NULL,
    BuyVolume decimal(28,10) NOT NULL,
    Quantity decimal(28,10) NOT NULL,
    BuyQuantity decimal(28,10) NOT NULL,
    OI int NOT NULL
);
INSERT INTO @t
EXEC [dbo].[CandlesReportRangeNew] @ticker, @period, @startDate, @endDate, @top;

SELECT
    CAST(0 AS int) AS Id,
    RoundDate AS Period,
    OpnPrice,
    ClsPrice,
    MinPrice,
    MaxPrice,
    Volume,
    BuyVolume,
    Quantity,
    BuyQuantity,
    OI AS Oi
FROM @t
ORDER BY RoundDate ASC;";

        var rows = await Database.SqlQueryRaw<BaseCandle>(sqlQuery, p_ticker, p_period, p_startDate, p_endDate, p_top)
            .ToListAsync();

        return rows.Select(x => new Candle
        {
            Id = x.Id,
            Period = x.Period,
            OpnPrice = x.OpnPrice,
            ClsPrice = x.ClsPrice,
            MinPrice = x.MinPrice,
            MaxPrice = x.MaxPrice,
            Volume = x.Volume,
            BuyVolume = x.BuyVolume,
            Quantity = x.Quantity,
            BuyQuantity = x.BuyQuantity,
            Oi = x.Oi
        }).ToList();

    }

    public async Task<List<Candle>> GetCandlesGluedProcAsync(string ticker, int period, DateTime startDate, DateTime endDate, int? top)

    {

        if (string.IsNullOrWhiteSpace(ticker))
            return new List<Candle>();

        if (!Database.IsSqlServer())
            throw new NotSupportedException("GetCandlesGluedProcAsync requires SQL Server provider.");

        SqlParameter p_ticker = new SqlParameter("@ticker", ticker);
        SqlParameter p_period = new SqlParameter("@period", period);
        SqlParameter p_startDate = new SqlParameter("@startDate", startDate);
        SqlParameter p_endDate = new SqlParameter("@endDate", endDate);
        SqlParameter p_top = new SqlParameter("@top", top ?? 50000);

        const string sqlQuery = @"
DECLARE @t TABLE (
    Id int NOT NULL,
    Period datetime NOT NULL,
    OpnPrice decimal(28,10) NOT NULL,
    ClsPrice decimal(28,10) NOT NULL,
    MinPrice decimal(28,10) NOT NULL,
    MaxPrice decimal(28,10) NOT NULL,
    Volume decimal(28,10) NOT NULL,
    BuyVolume decimal(28,10) NOT NULL,
    Quantity decimal(28,10) NOT NULL,
    BuyQuantity decimal(28,10) NOT NULL,
    OI int NOT NULL
);
INSERT INTO @t
EXEC [dbo].[CandlesReportRangeGlued] @ticker, @period, @startDate, @endDate, @top;

SELECT
    Id,
    Period,
    OpnPrice,
    ClsPrice,
    MinPrice,
    MaxPrice,
    Volume,
    BuyVolume,
    Quantity,
    BuyQuantity,
    OI AS Oi
FROM @t
ORDER BY Period ASC;";

        var rows = await Database.SqlQueryRaw<BaseCandle>(sqlQuery, p_ticker, p_period, p_startDate, p_endDate, p_top)
            .ToListAsync();

        return rows.Select(x => new Candle
        {
            Id = x.Id,
            Period = x.Period,
            OpnPrice = x.OpnPrice,
            ClsPrice = x.ClsPrice,
            MinPrice = x.MinPrice,
            MaxPrice = x.MaxPrice,
            Volume = x.Volume,
            BuyVolume = x.BuyVolume,
            Quantity = x.Quantity,
            BuyQuantity = x.BuyQuantity,
            Oi = x.Oi
        }).ToList();

    }











    public async Task<List<Candle>> GetCandlesIdAsync(int tickerid, byte market, double period, DateTime startDate, DateTime endDate, int? top)

    {

        return await GetCandlesNewLocalEfAsync(tickerid, market, period, startDate, endDate, top ?? 50000);

    }































    public async Task<List<Candle>> GetLastCandlesAsync(int tickerid, int period, int top)

    {
        return await GetLastCandlesLocalEfAsync(tickerid, period, top);

    }



    

    public IQueryable<ClusterProfileNewResult> ClusterProfileNewAsync(int? tickerid, int? period, DateTime? startdate, DateTime? finishdate, decimal? step, Byte? post)

    {



        // Parameters

        SqlParameter p_tickerid = new SqlParameter("@tickerid", tickerid ?? (object)DBNull.Value);

        p_tickerid.Direction = ParameterDirection.Input;

        p_tickerid.DbType = DbType.Int32;

        p_tickerid.Size = 4;

        SqlParameter p_period = new SqlParameter("@period", period ?? (object)DBNull.Value);

        p_period.Direction = ParameterDirection.Input;

        p_period.DbType = DbType.Int32;

        p_period.Size = 4;

        SqlParameter p_startdate = new SqlParameter("@startdate", startdate ?? (object)DBNull.Value);

        p_startdate.Direction = ParameterDirection.Input;

        p_startdate.DbType = DbType.DateTime;

        p_startdate.Size = 4;

        SqlParameter p_finishdate = new SqlParameter("@finishdate", finishdate ?? (object)DBNull.Value);

        p_finishdate.Direction = ParameterDirection.Input;

        p_finishdate.DbType = DbType.DateTime;

        p_finishdate.Size = 4;

        SqlParameter p_step = new SqlParameter("@step", step ?? (object)DBNull.Value);

        p_step.Direction = ParameterDirection.Input;

        p_step.DbType = DbType.Decimal;

        p_step.Size = 13;

        SqlParameter p_post = new SqlParameter("@post", post ?? (object)DBNull.Value);

        p_post.Direction = ParameterDirection.Input;

        p_post.DbType = DbType.Byte;

        p_post.Size = 1;

        // Processing 

        string sqlQuery = $@"EXEC [dbo].[ClusterProfileNew] @tickerid, @period, @startdate, @finishdate, @step, @post";

        //Output Data

        return this.ClusterProfileNew.FromSqlRaw(sqlQuery, p_tickerid, p_period, p_startdate, p_finishdate, p_step, p_post);

    }





    public Task<List<ClusterProfileResult>> ClusterProfileAsync(int? tickerid, double? period, DateTime? startdate, DateTime? finishdate, decimal? step, Byte? post)

    {



        // Parameters

        SqlParameter p_tickerid = new SqlParameter("@tickerid", tickerid ?? (object)DBNull.Value);

        p_tickerid.Direction = ParameterDirection.Input;

        p_tickerid.DbType = DbType.Int32;

        p_tickerid.Size = 4;

        SqlParameter p_period = new SqlParameter("@period", period ?? (object)DBNull.Value);

        p_period.Direction = ParameterDirection.Input;

        p_period.DbType = DbType.Double;

        p_period.Size = 8;

        SqlParameter p_startdate = new SqlParameter("@startdate", startdate ?? (object)DBNull.Value);

        p_startdate.Direction = ParameterDirection.Input;

        p_startdate.DbType = DbType.DateTime;

        p_startdate.Size = 4;

        SqlParameter p_finishdate = new SqlParameter("@finishdate", finishdate ?? (object)DBNull.Value);

        p_finishdate.Direction = ParameterDirection.Input;

        p_finishdate.DbType = DbType.DateTime;

        p_finishdate.Size = 4;

        SqlParameter p_step = new SqlParameter("@step", step ?? (object)DBNull.Value);

        p_step.Direction = ParameterDirection.Input;

        p_step.DbType = DbType.Decimal;

        p_step.Size = 13;

        SqlParameter p_post = new SqlParameter("@post", post ?? (object)DBNull.Value);

        p_post.Direction = ParameterDirection.Input;

        p_post.DbType = DbType.Byte;

        p_post.Size = 1;

        // Processing 

        string sqlQuery = $@"EXEC [dbo].[ClusterProfileQ] @tickerid, @period, @startdate, @finishdate, @step, @post";

        //Output Data

        return this.ClusterProfile.FromSqlRaw(sqlQuery, p_tickerid, p_period, p_startdate, p_finishdate, p_step, p_post).ToListAsync();

    }







   

    public async Task<List<LastTradingDateProcResult>> LastTradingDateProcAsync(Byte? market)

    {
        return await LastTradingDateProcLocalEfAsync(market);

    }

    

    public async Task<List<MarketMapPeriod4Result>> MarketMapPeriod4Async(DateTime? dat1, DateTime? dat2, Byte? market)

    {
        return await MarketMapPeriod4LocalEfAsync(dat1, dat2, market);

    }

    public async Task<List<MarketMapPeriod4Result>> MarketMapPeriod4EfAsync(DateTime? dat1, DateTime? dat2, Byte? market)

    {
        return await MarketMapPeriod4LocalEfAsync(dat1, dat2, market);

    }

    public async Task<List<MarketMapPeriod4Result>> MarketMapPeriod4EfTopByVolumeAsync(DateTime? dat1, DateTime? dat2, Byte? market, int top)

    {
        return await MarketMapPeriod4LocalEfAsync(dat1, dat2, market, top);

    }

    public async Task<List<MarketMapPeriod4Result>> MarketMapPeriod4ProcAsync(DateTime? dat1, DateTime? dat2, Byte? market)

    {
        if (!dat1.HasValue || !dat2.HasValue || !market.HasValue)
            return new List<MarketMapPeriod4Result>();

        if (!Database.IsSqlServer())
            throw new NotSupportedException("MarketMapPeriod4ProcAsync requires SQL Server provider.");

        SqlParameter p_dat1 = new SqlParameter("@dat1", dat1.Value);

        p_dat1.Direction = ParameterDirection.Input;

        p_dat1.DbType = DbType.DateTime;

        p_dat1.Size = 4;

        SqlParameter p_dat2 = new SqlParameter("@dat2", dat2.Value);

        p_dat2.Direction = ParameterDirection.Input;

        p_dat2.DbType = DbType.DateTime;

        p_dat2.Size = 4;

        SqlParameter p_market = new SqlParameter("@market", market.Value);

        p_market.Direction = ParameterDirection.Input;

        p_market.DbType = DbType.Byte;

        p_market.Size = 1;

        const string sqlQuery = @"EXEC [dbo].[MarketMapPeriod4] @dat1, @dat2, @market";

        return await MarketMapPeriod4.FromSqlRaw(sqlQuery, p_dat1, p_dat2, p_market).ToListAsync();

    }



   

    

    public async Task<List<tickersResult>> tickersAsync(string ticker, DateTime? startDate, DateTime? endDate)

    {
        return await TickersLocalEfAsync(ticker, startDate, endDate);

    }



    public async Task<List<tickersResult>> tickersIdAsync(int tickerid, DateTime? startDate, DateTime? endDate)

    {
        return await TickersByIdLocalEfAsync(tickerid, startDate, endDate);

    }









    public async Task<List<tickersdatesResult>> tickersdatesAsync(string ticker)

    {
        return await TickersDatesLocalEfAsync(ticker);

    }

    public async Task<List<TopOrdersResult>> TopOrdersAsync(string ticker, int? bigPeriod)

    {

        return await TopOrdersLocalEfAsync(ticker, bigPeriod);

    }

    public async Task<List<TopOrdersResult>> TopOrdersProcAsync(string ticker, int? bigPeriod)

    {

        if (string.IsNullOrWhiteSpace(ticker))
            return new List<TopOrdersResult>();

        if (!Database.IsSqlServer())
            throw new NotSupportedException("TopOrdersProcAsync requires SQL Server provider.");

        SqlParameter p_ticker = new SqlParameter("@ticker", ticker);
        SqlParameter p_bigPeriod = new SqlParameter("@bigPeriod", bigPeriod ?? 14);

        const string sqlQuery = @"EXEC [dbo].[TopOrders] @ticker, @bigPeriod";

        return await TopOrders.FromSqlRaw(sqlQuery, p_ticker, p_bigPeriod)
            .AsNoTracking()
            .ToListAsync();

    }



    public async Task<List<TopOrdersResult>> TopOrdersPeriodAsync(string ticker, DateTime startDate, DateTime endDate, int topN = 200)

    {

        return await TopOrdersPeriodLocalEfAsync(ticker, startDate, endDate, topN);

    }

    public async Task<List<TopOrdersResult>> TopOrdersPeriodProcAsync(string ticker, DateTime startDate, DateTime endDate, int topN = 200)

    {

        if (string.IsNullOrWhiteSpace(ticker))
            return new List<TopOrdersResult>();

        if (!Database.IsSqlServer())
            throw new NotSupportedException("TopOrdersPeriodProcAsync requires SQL Server provider.");

        SqlParameter p_ticker = new SqlParameter("@ticker", ticker);
        SqlParameter p_startDate = new SqlParameter("@startDate", startDate);
        SqlParameter p_endDate = new SqlParameter("@endDate", endDate);
        SqlParameter p_topN = new SqlParameter("@topN", topN);

        const string sqlQuery = @"EXEC [dbo].[TopOrdersPeriod] @ticker, @startDate, @endDate, @topN";

        return await TopOrders.FromSqlRaw(sqlQuery, p_ticker, p_startDate, p_endDate, p_topN)
            .AsNoTracking()
            .ToListAsync();

    }





    public async Task<List<VolumeSearchResult>> VolumeSearchAsync(string ticker, int? period, DateTime? startdate, DateTime? finishdate, Decimal step)

    {
        return await VolumeSearchLocalEfAsync(ticker, period, startdate, finishdate, step);

    }





}

