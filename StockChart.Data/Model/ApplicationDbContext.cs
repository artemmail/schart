using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using StockChart.Model.Settings;

namespace StockChart.Model;


public class ApplicationRole : IdentityRole<Guid>
{
    public ApplicationRole() : base() { }

    public ApplicationRole(string roleName) : base()
    {
        Name = roleName;
    }

    // Добавьте дополнительные свойства, если необходимо
}

public class ApplicationUser : IdentityUser<Guid>
{
    public ApplicationUser()
    {

    }
    public DateTime RegistrationDate { get; set; } = DateTime.Now;
    public virtual ICollection<Bill> Bills { get; } = new List<Bill>();
    public virtual ICollection<PushDevice> PushDevices { get; } = new List<PushDevice>();
    public virtual ICollection<Payment> Payments { get; } = new List<Payment>();
    public virtual ICollection<Topic> Topics { get; } = new List<Topic>();
    public virtual ICollection<Comment> TopicComments { get; } = new List<Comment>();
    public virtual ICollection<UserGameBallance> UserGameBallances { get; } = new List<UserGameBallance>();
    public virtual ICollection<UserGameOrder> UserGameOrders { get; } = new List<UserGameOrder>();
    public virtual ICollection<UserGameShare> UserGameShares { get; } = new List<UserGameShare>();
    public virtual ICollection<ChartSettings> ChartSettings { get; } = new List<ChartSettings>();


    public virtual ICollection<SinglePageTable> SinglePageTable { get; } = new List<SinglePageTable>();



    public virtual ICollection<UserLoginHistory> UserLoginHistory { get; } = new List<UserLoginHistory>();

    //public SelectedChartSettings SelectedChartSettings { get; set; }

}


public class ApplicationDbContext2
: IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{

    public ApplicationDbContext2()
    {
    }
    public ApplicationDbContext2(DbContextOptions options)
        : base(options)
    {
    }

    private readonly string _connectionString;

    public ApplicationDbContext2(string connectionString)
    {
        _connectionString = connectionString;
    }

    public virtual DbSet<Bill> Bills { get; set; }
    public virtual DbSet<ChartSettings> ChartSettings { get; set; }


    public virtual DbSet<SinglePageTable> SinglePageTable { get; set; }

    public virtual DbSet<FileEntity> FileEntities { get; set; }

    public virtual DbSet<UserLoginHistory> UserLoginHistory { get; set; }

    public virtual DbSet<OpenPosition> OpenPositions { get; set; }


    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
                .AddJsonFile("appsettings.json")
                .Build();

            optionsBuilder.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
        }
    }




}
public partial class ApplicationDbContext : ApplicationDbContext2
{
    public ApplicationDbContext()
    {
    }
    public ApplicationDbContext(DbContextOptions options)
       : base(options)
    {
    }

    private readonly string _connectionString;

    public ApplicationDbContext(string connectionString)
    {
        _connectionString = connectionString;
    }

    public virtual DbSet<UserGameBallance> UserGameBallances { get; set; }
    public virtual DbSet<UserGameOrder> UserGameOrders { get; set; }
    public virtual DbSet<UserGameShare> UserGameShares { get; set; }


    public virtual DbSet<Al> Als { get; set; }
    public virtual DbSet<Alert> Alerts { get; set; }

    public virtual DbSet<Bill> Bills_ { get; set; }
    public virtual DbSet<Candle> Candles { get; set; }
    public virtual DbSet<Category> Categories { get; set; }
    public virtual DbSet<CategoryType> CategoryTypes { get; set; }
    public virtual DbSet<Class> Classes { get; set; }
    public virtual DbSet<Cluster> Clusters { get; set; }

    //   public virtual DbSet<Comment> Comments { get; set; }
    public virtual DbSet<DayCandle> DayCandles { get; set; }
    public virtual DbSet<DayCluster> DayClusters { get; set; }

    public virtual DbSet<Devicesview> Devicesviews { get; set; }

    public virtual DbSet<DiconaryGlu> DiconaryGlus { get; set; }
    public virtual DbSet<Dictionary> Dictionaries { get; set; }

    public virtual DbSet<GlobalDicExt> GlobalDicExts { get; set; }
    public virtual DbSet<Lot> Lots { get; set; }
    public virtual DbSet<Market> Markets { get; set; }
    public virtual DbSet<MaxFullTrade> MaxFullTrades { get; set; }
    public virtual DbSet<MaxTrade> MaxTrades { get; set; }
    public virtual DbSet<MigrationHistory> MigrationHistories { get; set; }
    public virtual DbSet<MoexStruct> MoexStructs { get; set; }
    //public virtual DbSet<MoexStruct1> MoexStructs1 { get; set; }
    public virtual DbSet<Topic> Topics { get; set; }
    public virtual DbSet<Comment> TopicComments { get; set; }
    //   public virtual DbSet<NewsType> NewsTypes { get; set; }
    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<Share> Shares { get; set; }
    public virtual DbSet<Structure> Structures { get; set; }
    public virtual DbSet<Trade> Trades { get; set; }
    public virtual DbSet<TradesEx> Tradesexes { get; set; }
    public virtual DbSet<Tradesbinance> Tradesbinances { get; set; }
    public virtual DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
    public virtual DbSet<TaxSetting> TaxSettings { get; set; }





    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
                .AddJsonFile("appsettings.json")
                .Build();

            optionsBuilder.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
        }
    }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Al>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("al");
            entity.Property(e => e.Exectime)
                .HasColumnType("datetime")
                .HasColumnName("exectime");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.LastActivityDate).HasColumnType("datetime");
            entity.Property(e => e.LoweredUserName).HasMaxLength(256);
            entity.Property(e => e.MobileAlias).HasMaxLength(16);
            entity.Property(e => e.Price)
                .HasColumnType("money")
                .HasColumnName("price");
            entity.Property(e => e.Sign).HasColumnName("sign");
            entity.Property(e => e.Ticker)
                .HasMaxLength(12)
                .IsUnicode(false)
                .HasColumnName("ticker");
            entity.Property(e => e.Time)
                .HasColumnType("datetime")
                .HasColumnName("time");
            entity.Property(e => e.User).HasColumnName("user");
            entity.Property(e => e.UserName).HasMaxLength(256);
        });
        modelBuilder.Entity<Alert>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Alerts__3213E83F860A28E0");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Exectime)
                .HasColumnType("datetime")
                .HasColumnName("exectime");
            entity.Property(e => e.Price)
                .HasColumnType("money")
                .HasColumnName("price");
            entity.Property(e => e.Sign).HasColumnName("sign");
            entity.Property(e => e.Ticker)
                .HasMaxLength(12)
                .IsUnicode(false)
                .HasColumnName("ticker");
            entity.Property(e => e.Time)
                .HasColumnType("datetime")
                .HasColumnName("time");
            entity.Property(e => e.User).HasColumnName("user");

        });

        /*
        modelBuilder.Entity<Bill>(entity =>
        {
            entity.HasNoKey();
            entity.Property(e => e.Amount).HasColumnType("money");
            entity.Property(e => e.Date).HasColumnType("datetime");
            entity.HasOne(d => d.LoggedUser).WithMany()
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Bills__UserId__15660868");
        });*/
        modelBuilder.Entity<Candle>(entity =>
        {
            entity.HasNoKey();
            entity.HasIndex(e => new { e.Id, e.Period }, "ClusteredIdex-20230120-1702548")
                .IsUnique()
                .IsClustered();
            entity.Property(e => e.BuyQuantity).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.BuyVolume).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.ClsPrice).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.MaxPrice).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.MinPrice).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.Oi).HasColumnName("OI");
            entity.Property(e => e.OpnPrice).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.Period).HasColumnType("smalldatetime");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.Volume).HasColumnType("decimal(18, 6)");
            entity.HasOne(d => d.IdNavigation).WithMany()
                .HasForeignKey(d => d.Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Candles__Id__7C9A5A9E");
        });
        modelBuilder.Entity<Category>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("Category");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Securityid)
                .HasMaxLength(12)
                .IsUnicode(false)
                .HasColumnName("SECURITYID");
        });
        modelBuilder.Entity<CategoryType>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Category__3214EC07560B21FF");
            entity.ToTable("CategoryType");
            entity.Property(e => e.Name)
                .HasMaxLength(50)
                .IsUnicode(false);
        });
        modelBuilder.Entity<Class>(entity =>
        {
            entity.ToTable("Class");
        });
        modelBuilder.Entity<Cluster>(entity =>
        {
            entity.HasNoKey();
            entity.HasIndex(e => new { e.Id, e.Period, e.Price }, "ClusteredIndex-20230120-005253")
                .IsUnique()
                .IsClustered();
            entity.HasIndex(e => new { e.Id, e.Period }, "NonClusteredIndex-20230207-140351");
            entity.Property(e => e.Buyquantity)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("buyquantity");
            entity.Property(e => e.Count).HasColumnName("count");
            entity.Property(e => e.Maxtrade)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("maxtrade");
            entity.Property(e => e.Period)
                .HasColumnType("smalldatetime")
                .HasColumnName("period");
            entity.Property(e => e.Price)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("price");
            entity.Property(e => e.Quantity)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("quantity");
            entity.HasOne(d => d.IdNavigation).WithMany()
                .HasForeignKey(d => d.Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Clusters__Id__7E82A310");
        });


        modelBuilder.Entity<DayCandle>(entity =>
        {
            entity.HasNoKey();
            entity.HasIndex(e => new { e.Id, e.Period }, "Cluster3edIndex-20230223-142312")
                .IsUnique()
                .IsDescending(false, true)
                .IsClustered();
            entity.HasIndex(e => e.Period, "NonClustere3dIndex-20230223-143230");
            entity.Property(e => e.BuyQuantity).HasColumnType("decimal(22, 6)");
            entity.Property(e => e.BuyVolume).HasColumnType("decimal(22, 6)");
            entity.Property(e => e.ClsPrice).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.MaxPrice).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.MinPrice).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.Oi).HasColumnName("OI");
            entity.Property(e => e.OpnPrice).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.Period).HasColumnType("smalldatetime");
            entity.Property(e => e.Quantity).HasColumnType("decimal(22, 6)");
            entity.Property(e => e.Volume).HasColumnType("decimal(22, 6)");
            entity.HasOne(d => d.IdNavigation).WithMany()
                .HasForeignKey(d => d.Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__DayCandles__Id__7BA63665");
        });
        modelBuilder.Entity<DayCluster>(entity =>
        {
            entity.HasNoKey();
            entity.HasIndex(e => new { e.Id, e.Period, e.Price }, "ClusteredIndex-20230120-005235")
                .IsUnique()
                .IsClustered();
            entity.HasIndex(e => new { e.Id, e.Period }, "NonClusteredIndex-20230207-140412");
            entity.Property(e => e.Buyquantity)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("buyquantity");
            entity.Property(e => e.Count).HasColumnName("count");
            entity.Property(e => e.Maxtrade)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("maxtrade");
            entity.Property(e => e.Period)
                .HasColumnType("smalldatetime")
                .HasColumnName("period");
            entity.Property(e => e.Price)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("price");
            entity.Property(e => e.Quantity)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("quantity");
            entity.HasOne(d => d.IdNavigation).WithMany()
                .HasForeignKey(d => d.Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__DayClusters__Id__7D8E7ED7");
        });

        modelBuilder.Entity<Devicesview>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("devicesview");
            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Username)
                .HasMaxLength(256)
                .HasColumnName("username");
        });

        modelBuilder.Entity<DiconaryGlu>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("DiconaryGLU");
            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd()
                .HasColumnName("id");
            entity.Property(e => e.Securityid)
                .HasMaxLength(12)
                .HasColumnName("SECURITYID");
            entity.Property(e => e.Shortname)
                .HasMaxLength(40)
                .HasColumnName("SHORTNAME");
        });
        modelBuilder.Entity<DiconaryLastInfoRtsview>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("DiconaryLastInfoRTSView");
            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd()
                .HasColumnName("id");
            entity.Property(e => e.Securityid)
                .HasMaxLength(12)
                .HasColumnName("SECURITYID");
            entity.Property(e => e.Shortname)
                .HasMaxLength(128)
                .IsUnicode(false)
                .HasColumnName("shortname");
        });
        modelBuilder.Entity<Dictionary>(entity =>
        {
            entity.HasKey(e => e.Id).IsClustered(false);
            entity.ToTable("Dictionary");
            entity.HasIndex(e => e.Id, "ClusteredIndex-20230119-23212229")
                .IsUnique()
                .IsClustered();
            entity.HasIndex(e => e.Securityid, "NonClusteredIndex-202230119-2321241").IsUnique();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Currency)
                .HasMaxLength(32)
                .HasColumnName("currency");
            entity.Property(e => e.FromDate)
                .HasColumnType("datetime")
                .HasColumnName("from_date");
            entity.Property(e => e.Isin)
                .HasMaxLength(32)
                .HasColumnName("isin");
            entity.Property(e => e.Lotsize).HasColumnName("lotsize");
            entity.Property(e => e.Minstep)
                .HasColumnType("decimal(18, 8)")
                .HasColumnName("minstep");
            entity.Property(e => e.Oldid).HasColumnName("oldid");
            entity.Property(e => e.Scale).HasColumnName("scale");
            entity.Property(e => e.Securityid)
                .HasMaxLength(32)
                .HasColumnName("SECURITYID");
            entity.Property(e => e.Shortname).HasColumnName("SHORTNAME");
            entity.Property(e => e.ToDate)
                .HasColumnType("datetime")
                .HasColumnName("to_date");
            entity.Property(e => e.Volperqnt)
                .HasColumnType("decimal(18, 6)")
                .HasColumnName("volperqnt");
            entity.HasOne(d => d.CategoryType).WithMany(p => p.Dictionaries)
                .HasForeignKey(d => d.CategoryTypeId)
                .HasConstraintName("FK__Dictionar__Categ__11957784");
            entity.HasOne(d => d.Class).WithMany(p => p.Dictionaries)
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("FK__Dictionar__Class__10A1534B");
            entity.HasOne(d => d.MarketNavigation).WithMany(p => p.Dictionaries)
                .HasForeignKey(d => d.Market)
                .HasConstraintName("FK__Dictionar__Marke__0CD0C267");
        });

        modelBuilder.Entity<Lot>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("lot");
            entity.Property(e => e.ClassCode)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("class_code");
            entity.Property(e => e.ClassName)
                .HasMaxLength(256)
                .IsUnicode(false)
                .HasColumnName("class_name");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("code");
            entity.Property(e => e.FaceUnit)
                .HasMaxLength(256)
                .IsUnicode(false)
                .HasColumnName("face_unit");
            entity.Property(e => e.FaceValue)
                .HasMaxLength(256)
                .IsUnicode(false)
                .HasColumnName("face_value");
            entity.Property(e => e.IsinCode)
                .HasMaxLength(256)
                .IsUnicode(false)
                .HasColumnName("isin_code");
            entity.Property(e => e.LotSize)
                .HasColumnType("numeric(18, 0)")
                .HasColumnName("lot_size");
            entity.Property(e => e.MatDate)
                .HasMaxLength(256)
                .IsUnicode(false)
                .HasColumnName("mat_date");
            entity.Property(e => e.MinPriceStep)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("min_price_step");
            entity.Property(e => e.Name)
                .HasMaxLength(256)
                .IsUnicode(false)
                .HasColumnName("name");
            entity.Property(e => e.Scale)
                .HasColumnType("numeric(18, 0)")
                .HasColumnName("scale");
            entity.Property(e => e.ShortName)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("short_name");
        });
        modelBuilder.Entity<Market>().Property(e => e.Visible).HasConversion<byte>(); // f => f, t => t);
        modelBuilder.Entity<Market>().Property(e => e.Structed).HasConversion<byte>();// f => f, t => t);
        modelBuilder.Entity<Market>(entity =>
        {
            entity.Property(e => e.Visible).HasDefaultValueSql("((1))");
        });
        modelBuilder.Entity<Market>(entity =>
        {
            entity.Property(e => e.Structed).HasDefaultValueSql("((0))");
        });
        modelBuilder.Entity<MaxFullTrade>(entity =>
        {
            entity.HasNoKey();
        });
        modelBuilder.Entity<MaxTrade>(entity =>
        {
            entity.HasNoKey();
            entity.HasIndex(e => e.Id, "ClusteredIndex-20230116-233135")
                .IsUnique()
                .IsClustered();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MaxTime).HasColumnType("datetime");
        });
        modelBuilder.Entity<MigrationHistory>(entity =>
        {
            entity.HasKey(e => new { e.MigrationId, e.ContextKey }).HasName("PK_dbo.__MigrationHistory");
            entity.ToTable("__MigrationHistory");
            entity.Property(e => e.MigrationId).HasMaxLength(150);
            entity.Property(e => e.ContextKey).HasMaxLength(300);
            entity.Property(e => e.ProductVersion).HasMaxLength(32);
        });
        modelBuilder.Entity<MoexStruct>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("MoexStruct");
            entity.Property(e => e.Owner)
                .HasMaxLength(120)
                .IsUnicode(false);
            entity.HasOne(d => d.Dictionary).WithMany()
                .HasForeignKey(d => d.DictionaryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_dicti3onary_2");
        });



        /*
        modelBuilder.Entity<NewsType>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__NewsType__3214EC0706BD8B86");
            entity.ToTable("NewsType");
            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.Type)
                .HasMaxLength(128)
                .IsUnicode(false);
        });*/


        modelBuilder.Entity<Share>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("shares");
            entity.HasIndex(e => e.Secid, "ClusteredIndex-20160115-115705")
                .IsUnique()
                .IsClustered();
            entity.Property(e => e.Faceunit)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("FACEUNIT");
            entity.Property(e => e.Facevalue)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("FACEVALUE");
            entity.Property(e => e.Isin)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("ISIN");
            entity.Property(e => e.Issuedate)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("ISSUEDATE");
            entity.Property(e => e.Issuesize)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("ISSUESIZE");
            entity.Property(e => e.Latname)
                .HasMaxLength(500)
                .IsUnicode(false)
                .HasColumnName("LATNAME");
            entity.Property(e => e.Name)
                .HasMaxLength(500)
                .IsUnicode(false)
                .HasColumnName("NAME");
            entity.Property(e => e.Regnumber)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("REGNUMBER");
            entity.Property(e => e.Secid)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("SECID");
            entity.Property(e => e.Shortname)
                .HasMaxLength(500)
                .IsUnicode(false)
                .HasColumnName("SHORTNAME");
            entity.Property(e => e.Type)
                .HasMaxLength(500)
                .IsUnicode(false)
                .HasColumnName("TYPE");
            entity.Property(e => e.Typename)
                .HasMaxLength(500)
                .IsUnicode(false)
                .HasColumnName("TYPENAME");
        });
        modelBuilder.Entity<Structure>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("Structure");
            entity.Property(e => e.Owner)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.SecurityId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("SecurityID");
        });
        modelBuilder.Entity<Trade>(entity =>
        {
            entity.HasKey(e => new { e.Id, e.Number });
            entity.ToTable("trades", tb =>
                {
                    tb.HasTrigger("ClusterrTrigger1");
                    tb.HasTrigger("autocandle1e1ex21");
                    tb.HasTrigger("candleT8rigger1");
                    tb.HasTrigger("maxupdater1");
                });
            entity.HasIndex(e => new { e.Id, e.TradeDate }, "ClusteredIndex-20230219-092123").IsClustered();
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.Number).HasColumnName("number");
            entity.Property(e => e.Oi).HasColumnName("OI");
            entity.Property(e => e.Price).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.TradeDate).HasColumnType("datetime");
            entity.Property(e => e.Volume).HasColumnType("decimal(18, 6)");
            entity.HasOne(d => d.IdNavigation).WithMany()
                .HasForeignKey(d => d.Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__trades__ID__006AEB82");
        });
        modelBuilder.Entity<TradesEx>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_dbo.tradesEXes");
            entity.ToTable("tradesEX");
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.Number).HasColumnName("number");
            entity.Property(e => e.Oi).HasColumnName("OI");
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.RoundDate).HasColumnType("datetime");
            entity.Property(e => e.TradeDate).HasColumnType("datetime");
            entity.Property(e => e.Volume).HasColumnType("decimal(18, 2)");
        });
        modelBuilder.Entity<Tradesbinance>(entity =>
        {
            entity.HasKey(e => new { e.Id, e.Number });
            entity.ToTable("tradesbinance", tb => tb.HasTrigger("autocandlebin"));
            entity.HasIndex(e => new { e.Id, e.TradeDate }, "ClusteredIndex-20230223-120044").IsClustered();
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.Number).HasColumnName("number");
            entity.Property(e => e.Price).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 6)");
            entity.Property(e => e.TradeDate).HasColumnType("datetime");
            entity.HasOne(d => d.IdNavigation).WithMany()
                .HasForeignKey(d => d.Id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__tradesbinanc__ID__7F76C749");
        });

        modelBuilder.Entity<SubscriptionPlan>(entity =>
        {
            entity.Property(e => e.Interval)
                .HasMaxLength(8)
                .IsUnicode(false);
            entity.Property(e => e.ReferalInterval)
                .HasMaxLength(8)
                .IsUnicode(false);
            entity.Property(e => e.OrdinalMoney).HasColumnType("money");
            entity.Property(e => e.DiscountMoney).HasColumnType("money");
        });

        modelBuilder.Entity<TaxSetting>(entity =>
        {
            entity.Property(e => e.DiscountBefore).HasColumnType("datetime");
        });




        OnModelCreatingPartial(modelBuilder);
    }
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
