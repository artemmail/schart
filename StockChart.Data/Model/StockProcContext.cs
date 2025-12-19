using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockChart.Model;
using System.Data;
public partial class StockProcContext : ApplicationDbContext
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
    public StockProcContext()
    {
    }
    [ActivatorUtilitiesConstructor]
    public StockProcContext(DbContextOptions<StockProcContext> options)
        : base(options)
    {
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {        
        modelBuilder.Entity<AliasResult>().HasNoKey();
        modelBuilder.Entity<candleseekerResult>().HasNoKey();
        modelBuilder.Entity<Candle>().HasNoKey();
        modelBuilder.Entity<Candle>().HasNoKey();
        modelBuilder.Entity<ClusterProfileNewResult>().HasNoKey();
        modelBuilder.Entity<ClusterProfileResult>().HasNoKey();              
        modelBuilder.Entity<LastTradingDateProcResult>().HasNoKey();        
        modelBuilder.Entity<MarketMapPeriod4Result>().HasNoKey();
        modelBuilder.Entity<MicexVolYearResult>().HasNoKey();
        modelBuilder.Entity<tickersResult>().HasNoKey();
        modelBuilder.Entity<tickersdatesResult>().HasNoKey();
        modelBuilder.Entity<TopOrdersResult>().HasNoKey();
        modelBuilder.Entity<VolumeSearchResult>().HasNoKey();
        modelBuilder.Entity<MissingIntervalWithTrades>().HasNoKey();
        //Thanks Valecass!!!
        base.OnModelCreating(modelBuilder);
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
        //Initialize Result 
        List<AliasResult> lst = new List<AliasResult>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@ticker", ticker ?? (object)DBNull.Value);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.String;
            p_ticker.Size = 16;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[Alias] @ticker";

            //Output Data
            lst = await this.Alias.FromSqlRaw(sqlQuery, p_ticker).ToListAsync();
        }
        catch
        {
            throw;
        }
        //Return
        return lst;
    }


   
    public async Task<List<candleseekerResult>> VolumeSplashAsync(int bigPeriod, int smallPeriod, byte market, double splash)
    {
        //Initialize Result 
        List<candleseekerResult> lst = new List<candleseekerResult>();
        try
        {
            // Parameters
            SqlParameter p_bigPeriod = new SqlParameter("@bigPeriod", bigPeriod);
            p_bigPeriod.Direction = ParameterDirection.Input;
            p_bigPeriod.DbType = DbType.Int32;
            p_bigPeriod.Size = 4;
            SqlParameter p_smallPeriod = new SqlParameter("@smallPeriod", smallPeriod);
            p_smallPeriod.Direction = ParameterDirection.Input;
            p_smallPeriod.DbType = DbType.Int32;
            p_smallPeriod.Size = 4;
            SqlParameter p_market = new SqlParameter("@market", market);
            p_market.Direction = ParameterDirection.Input;
            p_market.DbType = DbType.Byte;
            p_market.Size = 1;
            SqlParameter p_splash = new SqlParameter("@splash", splash);
            p_splash.Direction = ParameterDirection.Input;
            p_splash.DbType = DbType.Double;
            p_splash.Size = 8;
            string sqlQuery = $@"EXEC [dbo].[VolumeSplash] @bigPeriod, @smallPeriod, @market, @splash";
            //Output Data
            lst = await this.VolumeSplash.FromSqlRaw(sqlQuery, p_bigPeriod, p_smallPeriod, p_market, p_splash).ToListAsync();
        }
        catch (Exception e)
        {
            throw;
        }
        //Return
        return lst;
    }
   
    public async Task<List<Candle>> GetCandlesGluedAsync(string ticker, int? period, DateTime? startDate, DateTime? endDate, int? top)
    {
        List<Candle> lst = new List<Candle>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@ticker", ticker ?? (object)DBNull.Value);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.String;
            p_ticker.Size = 12;
            SqlParameter p_period = new SqlParameter("@period", period ?? (object)DBNull.Value);
            p_period.Direction = ParameterDirection.Input;
            p_period.DbType = DbType.Int32;
            p_period.Size = 4;
            SqlParameter p_startDate = new SqlParameter("@startDate", startDate ?? (object)DBNull.Value);
            p_startDate.Direction = ParameterDirection.Input;
            p_startDate.DbType = DbType.DateTime;
            p_startDate.Size = 8;
            SqlParameter p_endDate = new SqlParameter("@endDate", endDate ?? (object)DBNull.Value);
            p_endDate.Direction = ParameterDirection.Input;
            p_endDate.DbType = DbType.DateTime;
            p_endDate.Size = 8;
            SqlParameter p_top = new SqlParameter("@top", top ?? (object)DBNull.Value);
            p_top.Direction = ParameterDirection.Input;
            p_top.DbType = DbType.Int32;
            p_top.Size = 4;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[CandlesReportRangeGlued] @ticker, @period, @startDate, @endDate, @top";
            //Execution
            lst = await this.GetCandles.FromSqlRaw(sqlQuery, p_ticker, p_period, p_startDate, p_endDate, p_top).ToListAsync();
        }
        catch (Exception e)
        {
            throw;
        }
        return lst;
    }
    public async Task<List<Candle>> GetCandlesAsync(string ticker, double period, DateTime startDate, DateTime endDate, int? top)
    {
        //Initialize Result 
        List<Candle> lst = new List<Candle>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@ticker", ticker);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.String;
            p_ticker.Size = 50;
            SqlParameter p_period = new SqlParameter("@period", period);
            p_period.Direction = ParameterDirection.Input;
            p_period.DbType = DbType.Double;
            p_period.Size = 8;
            SqlParameter p_startDate = new SqlParameter("@startDate", startDate);
            p_startDate.Direction = ParameterDirection.Input;
            p_startDate.DbType = DbType.DateTime;
            p_startDate.Size = 8;
            SqlParameter p_endDate = new SqlParameter("@endDate", endDate);
            p_endDate.Direction = ParameterDirection.Input;
            p_endDate.DbType = DbType.DateTime;
            p_endDate.Size = 8;
            SqlParameter p_top = new SqlParameter("@top", top ?? (object)DBNull.Value);
            p_top.Direction = ParameterDirection.Input;
            p_top.DbType = DbType.Int32;
            p_top.Size = 4;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[GetCandles] @ticker, @period, @startDate, @endDate, @top";

            //Output Data
            lst = await this.GetCandles.FromSqlRaw(sqlQuery, p_ticker, p_period, p_startDate, p_endDate, p_top).ToListAsync();
        }
        catch (Exception e)
        {
            throw;
        }
        //Return
        return lst;
    }





    public async Task<List<Candle>> GetCandlesIdAsync(int tickerid, byte market, double period, DateTime startDate, DateTime endDate, int? top)
    {
        //Initialize Result 
        List<Candle> lst = new List<Candle>();
        try
        {
            // Parameters
            SqlParameter p_market = new SqlParameter("@market", market);
            p_market.Direction = ParameterDirection.Input;
            p_market.DbType = DbType.Byte;
            p_market.Size = 1;
            SqlParameter p_tickerid = new SqlParameter("@tickerid", tickerid);
            p_tickerid.Direction = ParameterDirection.Input;
            p_tickerid.DbType = DbType.Int32;
            p_tickerid.Size = 4;
            SqlParameter p_period = new SqlParameter("@period", period);
            p_period.Direction = ParameterDirection.Input;
            p_period.DbType = DbType.Double;
            p_period.Size = 8;
            SqlParameter p_startDate = new SqlParameter("@startDate", startDate);
            p_startDate.Direction = ParameterDirection.Input;
            p_startDate.DbType = DbType.DateTime;
            p_startDate.Size = 8;
            SqlParameter p_endDate = new SqlParameter("@endDate", endDate);
            p_endDate.Direction = ParameterDirection.Input;
            p_endDate.DbType = DbType.DateTime;
            p_endDate.Size = 8;
            SqlParameter p_top = new SqlParameter("@top", top ?? (object)DBNull.Value);
            p_top.Direction = ParameterDirection.Input;
            p_top.DbType = DbType.Int32;
            p_top.Size = 4;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[GetCandlesId] @tickerid, @market, @period, @startDate, @endDate, @top";

            //Output Data
            lst = await this.GetCandles.FromSqlRaw(sqlQuery, p_tickerid, p_market, p_period, p_startDate, p_endDate, p_top).ToListAsync();
        }
        catch (Exception e)
        {
            throw;
        }
        //Return
        return lst;
    }















    public async Task<List<Candle>> GetLastCandlesAsync(int tickerid, int period, int top)
    {
        //Initialize Result 
        List<Candle> lst = new List<Candle>();
        try
        {
            // Parameters
            SqlParameter p_tickerid = new SqlParameter("@tickerid", tickerid);
            p_tickerid.Direction = ParameterDirection.Input;
            p_tickerid.DbType = DbType.Int32;
            p_tickerid.Size = 4;
            SqlParameter p_period = new SqlParameter("@period", period);
            p_period.Direction = ParameterDirection.Input;
            p_period.DbType = DbType.Int32;
            p_period.Size = 4;
            SqlParameter p_top = new SqlParameter("@top", top);
            p_top.Direction = ParameterDirection.Input;
            p_top.DbType = DbType.Int32;
            p_top.Size = 4;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[GetLastCandles] @tickerid, @period, @top";

            //Output Data
            lst = await this.GetLastCandles.FromSqlRaw(sqlQuery, p_tickerid, p_period, p_top).ToListAsync();
        }
        catch
        {
            throw;
        }
        //Return
        return lst;
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
        //Initialize Result 
        List<LastTradingDateProcResult> lst = new List<LastTradingDateProcResult>();
        try
        {
            // Parameters
            SqlParameter p_market = new SqlParameter("@market", market ?? (object)DBNull.Value);
            p_market.Direction = ParameterDirection.Input;
            p_market.DbType = DbType.Byte;
            p_market.Size = 1;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[LastTradingDateProc] @market";

            //Output Data
            lst = await this.LastTradingDateProc.FromSqlRaw(sqlQuery, p_market).ToListAsync();
        }
        catch
        {
            throw;
        }
        //Return
        return lst;
    }
    
    public async Task<List<MarketMapPeriod4Result>> MarketMapPeriod4Async(DateTime? dat1, DateTime? dat2, Byte? market)
    {
        //Initialize Result 
        List<MarketMapPeriod4Result> lst = new List<MarketMapPeriod4Result>();
        try
        {
            // Parameters
            SqlParameter p_dat1 = new SqlParameter("@dat1", dat1 ?? (object)DBNull.Value);
            p_dat1.Direction = ParameterDirection.Input;
            p_dat1.DbType = DbType.DateTime;
            p_dat1.Size = 4;
            SqlParameter p_dat2 = new SqlParameter("@dat2", dat2 ?? (object)DBNull.Value);
            p_dat2.Direction = ParameterDirection.Input;
            p_dat2.DbType = DbType.DateTime;
            p_dat2.Size = 4;
            SqlParameter p_market = new SqlParameter("@market", market ?? (object)DBNull.Value);
            p_market.Direction = ParameterDirection.Input;
            p_market.DbType = DbType.Byte;
            p_market.Size = 1;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[MarketMapPeriod4] @dat1, @dat2, @market";

            //Output Data
            lst = await this.MarketMapPeriod4.FromSqlRaw(sqlQuery, p_dat1, p_dat2, p_market).ToListAsync();
        }
        catch
        {
            throw;
        }
        //Return
        return lst;
    }

   
    
    public async Task<List<tickersResult>> tickersAsync(string ticker, DateTime? startDate, DateTime? endDate)
    {
        //Initialize Result 
        List<tickersResult> lst = new List<tickersResult>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@ticker", ticker ?? (object)DBNull.Value);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.String;
            p_ticker.Size = 50;
            SqlParameter p_startDate = new SqlParameter("@startDate", startDate ?? (object)DBNull.Value);
            p_startDate.Direction = ParameterDirection.Input;
            p_startDate.DbType = DbType.DateTime;
            p_startDate.Size = 8;
            SqlParameter p_endDate = new SqlParameter("@endDate", endDate ?? (object)DBNull.Value);
            p_endDate.Direction = ParameterDirection.Input;
            p_endDate.DbType = DbType.DateTime;
            p_endDate.Size = 8;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[tickers] @ticker, @startDate, @endDate";

            //Output Data
            lst = await this.tickers.FromSqlRaw(sqlQuery, p_ticker, p_startDate, p_endDate).ToListAsync();
        }
        catch
        {
            throw;
        }
        //Return
        return lst;
    }

    public async Task<List<tickersResult>> tickersIdAsync(int tickerid, DateTime? startDate, DateTime? endDate)
    {
        //Initialize Result 
        List<tickersResult> lst = new List<tickersResult>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@tickerid", tickerid);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.Int32;
            p_ticker.Size = 4;
            SqlParameter p_startDate = new SqlParameter("@startDate", startDate ?? (object)DBNull.Value);
            p_startDate.Direction = ParameterDirection.Input;
            p_startDate.DbType = DbType.DateTime;
            p_startDate.Size = 8;
            SqlParameter p_endDate = new SqlParameter("@endDate", endDate ?? (object)DBNull.Value);
            p_endDate.Direction = ParameterDirection.Input;
            p_endDate.DbType = DbType.DateTime;
            p_endDate.Size = 8;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[tickersid] @tickerid, @startDate, @endDate";

            //Output Data
            lst = await this.tickers.FromSqlRaw(sqlQuery, p_ticker, p_startDate, p_endDate).ToListAsync();
        }
        catch
        {
            throw;
        }
        //Return
        return lst;
    }




    public async Task<List<tickersdatesResult>> tickersdatesAsync(string ticker)
    {
        //Initialize Result 
        List<tickersdatesResult> lst = new List<tickersdatesResult>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@ticker", ticker ?? (object)DBNull.Value);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.String;
            p_ticker.Size = 50;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[tickersdates] @ticker";

            //Output Data
            lst = await this.tickersdates.FromSqlRaw(sqlQuery, p_ticker).ToListAsync();
        }
        catch
        {
            throw;
        }
        //Return
        return lst;
    }
    public async Task<List<TopOrdersResult>> TopOrdersAsync(string ticker, int? bigPeriod)
    {
        //Initialize Result 
        List<TopOrdersResult> lst = new List<TopOrdersResult>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@ticker", ticker ?? (object)DBNull.Value);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.String;
            p_ticker.Size = 12;
            SqlParameter p_bigPeriod = new SqlParameter("@bigPeriod", bigPeriod ?? (object)DBNull.Value);
            p_bigPeriod.Direction = ParameterDirection.Input;
            p_bigPeriod.DbType = DbType.Int32;
            p_bigPeriod.Size = 4;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[TopOrders] @ticker, @bigPeriod";

            //Output Data
            lst = await this.TopOrders.FromSqlRaw(sqlQuery, p_ticker, p_bigPeriod).ToListAsync();
        }
        catch
        {
            throw;
        }
        //Return
        return lst;
    }

    public async Task<List<TopOrdersResult>> TopOrdersPeriodAsync(string ticker, DateTime startDate, DateTime endDate, int topN = 200)
    {
        // Initialize Result 
        List<TopOrdersResult> lst = new List<TopOrdersResult>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@ticker", ticker ?? (object)DBNull.Value);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.String;
            p_ticker.Size = 20;

            SqlParameter p_startDate = new SqlParameter("@startDate", startDate == DateTime.MinValue ? (object)DBNull.Value : startDate);
            p_startDate.Direction = ParameterDirection.Input;
            p_startDate.DbType = DbType.DateTime;

            SqlParameter p_endDate = new SqlParameter("@endDate", endDate == DateTime.MinValue ? (object)DBNull.Value : endDate);
            p_endDate.Direction = ParameterDirection.Input;
            p_endDate.DbType = DbType.DateTime;

            SqlParameter p_topN = new SqlParameter("@topN", topN);
            p_topN.Direction = ParameterDirection.Input;
            p_topN.DbType = DbType.Int32;

            // Processing 
            string sqlQuery = $@"EXEC [dbo].[TopOrdersPeriod] @ticker, @startDate, @endDate, @topN";

            // Output Data
            lst = await this.TopOrders.FromSqlRaw(sqlQuery, p_ticker, p_startDate, p_endDate, p_topN).ToListAsync();
        }
        catch
        {
            throw;
        }
        // Return
        return lst;
    }


    public async Task<List<VolumeSearchResult>> VolumeSearchAsync(string ticker, int? period, DateTime? startdate, DateTime? finishdate, Decimal step)
    {
        //Initialize Result 
        List<VolumeSearchResult> lst = new List<VolumeSearchResult>();
        try
        {
            // Parameters
            SqlParameter p_ticker = new SqlParameter("@ticker", ticker ?? (object)DBNull.Value);
            p_ticker.Direction = ParameterDirection.Input;
            p_ticker.DbType = DbType.String;
            p_ticker.Size = 50;
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
            SqlParameter p_step = new SqlParameter("@step", step);
            p_step.Direction = ParameterDirection.Input;
            p_step.DbType = DbType.Decimal;
            p_step.Size = 8;
            // Processing 
            string sqlQuery = $@"EXEC [dbo].[VolumeSearch] @ticker, @period, @startdate, @finishdate, @step";

            //Output Data
            lst = await this.VolumeSearch.FromSqlRaw(sqlQuery, p_ticker, p_period, p_startdate, p_finishdate, p_step).ToListAsync();
        }
        catch (Exception ex)
        {
            throw;
        }
        //Return
        return lst;
    }


    public sealed record VolumeDashboardRow(
    string name,
    string ticker,
    decimal volume1Day,     // îáú¸ì çà òåêóùóþ ñåññèþ
    decimal avg3Days,       // ñðåäíåå çà 7 ïðåäûäóùèõ òîðãîâûõ äíåé
    decimal avg7Days,       // ñðåäíåå çà 7 ïðåäûäóùèõ òîðãîâûõ äíåé
    decimal avg30Days,      // ñðåäíåå çà 30 ïðåäûäóùèõ òîðãîâûõ äíåé
    decimal avg90Days,      // è ò. ä.
    decimal avg180Days,
    decimal avg365Days);


    public class AliasResult
    {
        public string SECURITYID { get; set; }
    }

   
    public class candleseekerResult
    {
        public decimal? huge { get; set; }
        public decimal? max { get; set; }
        public decimal? avgval { get; set; }
        public string ticker { get; set; }
        public string name { get; set; }
        public decimal cls { get; set; }
    }
    
    public class ClusterProfileNewResult
    {
        public DateTime period { get; set; }
        public decimal price { get; set; }
        public decimal quantity { get; set; }
        public decimal buyquantity { get; set; }
        public decimal opnprice { get; set; }
        public decimal clsprice { get; set; }
        public decimal minprice { get; set; }
        public decimal maxprice { get; set; }
        public int oi { get; set; }
        public int count { get; set; }
        public decimal maxtrade { get; set; }
    }


    public class ClusterProfileResult
    {
        public DateTime period { get; set; }
        public decimal price { get; set; }
        public decimal quantity { get; set; }
        public decimal buyquantity { get; set; }
        public int count { get; set; }
        public decimal maxtrade { get; set; }
    }


   
    public class LastTradingDateProcResult
    {
        public DateTime period { get; set; }
    }
   
    public class MarketMapPeriod4Result
    {
        public int Id { get; set; }
        public decimal Opn { get; set; }
        public decimal Cls { get; set; }
        public decimal Volume { get; set; }
        public decimal BuyVolume { get; set; }
    }
    public class MicexVolYearResult
    {
        public decimal? Volume { get; set; }
        public decimal? BuyVolume { get; set; }
        public DateTime Date { get; set; }
    }
    
    public class tickersResult
    {
        public long Number { get; set; }
        public DateTime TradeDate { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public Byte Direction { get; set; }
        public decimal Volume { get; set; }
        public int OI { get; set; }
    }
    public class tickersdatesResult
    {
        public DateTime period { get; set; }
    }
    public class TopOrdersResult
    {
        public DateTime tradeDate { get; set; }
        public decimal price { get; set; }
        public int quantity { get; set; }
        public decimal volume { get; set; }
        public Byte direction { get; set; }
    }
   
    public class VolumeSearchResult
    {
        public DateTime Time { get; set; }
        public decimal Price { get; set; }
        public int MaxVolume { get; set; }
        public int TotalVolume { get; set; }
        public int BarSize { get; set; }
        public int Trades { get; set; }
        public int Ask { get; set; }
        public int Bid { get; set; }
        public int Delta { get; set; }
    }
}
