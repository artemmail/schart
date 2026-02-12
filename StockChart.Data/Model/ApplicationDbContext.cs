using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
    public virtual ICollection<McpConversation> McpConversations { get; } = new List<McpConversation>();

    //public SelectedChartSettings SelectedChartSettings { get; set; }

}


public partial class ApplicationDbContext
: IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{

    public ApplicationDbContext()
    {
    }
    [ActivatorUtilitiesConstructor]
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
    protected ApplicationDbContext(DbContextOptions options)
        : base(options)
    {
    }

    private readonly string _connectionString;

    public ApplicationDbContext(string connectionString)
    {
        _connectionString = connectionString;
    }

    public virtual DbSet<Bill> Bills { get; set; }
    public virtual DbSet<ChartSettings> ChartSettings { get; set; }


    public virtual DbSet<SinglePageTable> SinglePageTable { get; set; }

    public virtual DbSet<FileEntity> FileEntities { get; set; }

    public virtual DbSet<UserLoginHistory> UserLoginHistory { get; set; }

    public virtual DbSet<OpenPosition> OpenPositions { get; set; }

    public virtual DbSet<FootprintFavorite> FootprintFavorites { get; set; }
    public virtual DbSet<FootprintFavoritesBoard> FootprintFavoritesBoards { get; set; }
    public virtual DbSet<FootprintLevelMark> FootprintLevelMarks { get; set; }

    public virtual DbSet<DividendsMoex> DividendsMoex { get; set; }
    public virtual DbSet<DividendsMoexUpdateLog> DividendsMoexUpdateLogs { get; set; }
    public virtual DbSet<BondSpec> BondSpecs { get; set; }
    public virtual DbSet<BondMarketSnapshot> BondMarketSnapshots { get; set; }
    public virtual DbSet<BondCoupon> BondCoupons { get; set; }
    public virtual DbSet<MoexSecurityType> MoexSecurityTypes { get; set; }
    public virtual DbSet<FutureSpec> FutureSpecs { get; set; }
    public virtual DbSet<OptionSpec> OptionSpecs { get; set; }
    public virtual DbSet<OptionMarketSnapshot> OptionMarketSnapshots { get; set; }
    public virtual DbSet<SecurityLink> SecurityLinks { get; set; }
    public virtual DbSet<UnderlyingMap> UnderlyingMaps { get; set; }
    public virtual DbSet<ShareholderSnapshot> ShareholderSnapshots { get; set; }
    public virtual DbSet<ShareholderEntry> ShareholderEntries { get; set; }
    public virtual DbSet<RecommendationSnapshot> RecommendationSnapshots { get; set; }
    public virtual DbSet<RecommendationReason> RecommendationReasons { get; set; }
    public virtual DbSet<FinancialStatementEntry> FinancialStatementEntries { get; set; }
    public virtual DbSet<FinancialStatementDictionary> FinancialStatementDictionaries { get; set; }
    public virtual DbSet<McpConversation> McpConversations { get; set; }
    public virtual DbSet<McpConversationMessage> McpConversationMessages { get; set; }



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
public partial class ApplicationDbContext
{
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





    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Explicit decimal types to avoid implicit precision defaults/truncation warnings.
        modelBuilder.Entity<Bill>(entity =>
        {
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<Dictionary>(entity =>
        {
            entity.Property(e => e.Minstep).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Volperqnt).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(e => e.PayAmount).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<UserGameBallance>(entity =>
        {
            entity.Property(e => e.Ballance).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<UserGameOrder>(entity =>
        {
            entity.ToTable("UserGameOrder", t => t.ExcludeFromMigrations());
            entity.Property(e => e.Price).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<FinancialStatementDictionary>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("FinancialStatementDictionary");
            entity.Property(e => e.Code).HasMaxLength(256);
            entity.Property(e => e.Value).HasMaxLength(512);
            entity.Property(e => e.IsClickable).HasDefaultValue(true);
            entity.Property(e => e.ValueType).HasMaxLength(16).HasDefaultValue("number");
            entity.Property(e => e.SortGroup).HasMaxLength(64);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Tooltip).HasMaxLength(1024);
            entity.Property(e => e.Unit).HasMaxLength(64);
            entity.HasIndex(e => e.Code).IsUnique();
        });

        modelBuilder.Entity<FinancialStatementEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("FinancialStatementEntries");
            entity.Property(e => e.MetricId);
            entity.Property(e => e.Standard).HasMaxLength(8);
            entity.Property(e => e.Period).HasMaxLength(4);
            entity.Property(e => e.Name).HasMaxLength(256);
            entity.Property(e => e.Year).HasMaxLength(32);
            entity.Property(e => e.ValueNum).HasColumnType("decimal(28,10)");
            entity.Property(e => e.ImportedAt).HasColumnType("datetime2");
            entity.HasIndex(e => new { e.DictionaryId, e.Standard, e.Period, e.MetricId, e.Year }).IsUnique();
            entity.HasIndex(e => new { e.DictionaryId, e.Standard, e.Period, e.SortOrder });
            entity.HasOne(d => d.Dictionary).WithMany()
                .HasForeignKey(d => d.DictionaryId)
                .HasConstraintName("FK_FinancialStatementEntries_Dictionary");
            entity.HasOne(d => d.Metric).WithMany(p => p.Entries)
                .HasForeignKey(d => d.MetricId)
                .HasConstraintName("FK_FinancialStatementEntries_Metric");
        });

        modelBuilder.Entity<McpConversation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("McpConversations");
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.LastMessagePreview).HasMaxLength(512);
            entity.Property(e => e.ProviderConversationId).HasMaxLength(128);
            entity.Property(e => e.ProviderLastResponseId).HasMaxLength(128);
            entity.Property(e => e.ProviderApiMode).HasMaxLength(64);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");
            entity.Property(e => e.LastMessageAt).HasColumnType("datetime2");
            entity.HasIndex(e => new { e.UserId, e.UpdatedAt });
            entity.HasOne(e => e.User)
                .WithMany(u => u.McpConversations)
                .HasForeignKey(e => e.UserId)
                .HasConstraintName("FK_McpConversations_AspNetUsers_UserId");
        });

        modelBuilder.Entity<McpConversationMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("McpConversationMessages");
            entity.Property(e => e.Role).HasMaxLength(32);
            entity.Property(e => e.Provider).HasMaxLength(64);
            entity.Property(e => e.Model).HasMaxLength(128);
            entity.Property(e => e.ProviderMessageId).HasMaxLength(128);
            entity.Property(e => e.CreatedAt).HasColumnType("datetime2");
            entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .HasConstraintName("FK_McpConversationMessages_McpConversations_ConversationId");
        });

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
            entity.ToTable("Alerts", t => t.ExcludeFromMigrations());
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
            entity.ToTable("Candles", t => t.ExcludeFromMigrations());
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
                .ToTable("Category", t => t.ExcludeFromMigrations());
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
            entity.ToTable("CategoryType", t => t.ExcludeFromMigrations());
            entity.Property(e => e.Name)
                .HasMaxLength(50)
                .IsUnicode(false);
        });
        modelBuilder.Entity<Class>(entity =>
        {
            entity.ToTable("Class", t => t.ExcludeFromMigrations());
        });
        modelBuilder.Entity<Cluster>(entity =>
        {
            entity.HasNoKey();
            entity.ToTable("Clusters", t => t.ExcludeFromMigrations());
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
            entity.ToTable("DayCandles", t => t.ExcludeFromMigrations());
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
            entity.ToTable("DayClusters", t => t.ExcludeFromMigrations());
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
                .ToTable("DiconaryGLU", t => t.ExcludeFromMigrations());
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
        modelBuilder.Entity<GlobalDicExt>(entity =>
        {
            entity.ToTable("GlobalDicExt", t => t.ExcludeFromMigrations());
        });
        modelBuilder.Entity<Dictionary>(entity =>
        {
            entity.HasKey(e => e.Id).IsClustered(false);
            entity.ToTable("Dictionary", t => t.ExcludeFromMigrations());
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
            entity.Property(e => e.EmitentId)
                .HasColumnName("emitent_id");
            entity.Property(e => e.EmitentTitle)
                .HasMaxLength(256)
                .HasColumnName("emitent_title");
            entity.Property(e => e.EmitentInn)
                .HasMaxLength(16)
                .HasColumnName("emitent_inn");
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

        modelBuilder.Entity<DividendsMoex>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("DividendsMoex");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Datetime).HasColumnType("datetime2");
            entity.Property(e => e.Value).HasColumnType("decimal(18, 2)");
            entity.HasIndex(e => e.DictionaryId);
            entity.HasOne(d => d.Dictionary).WithMany()
                .HasForeignKey(d => d.DictionaryId)
                .HasConstraintName("FK_DividendsMoex_Dictionary");
        });

        modelBuilder.Entity<DividendsMoexUpdateLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("DividendsMoexUpdateLogs");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");
        });

        modelBuilder.Entity<BondSpec>(entity =>
        {
            entity.HasKey(e => e.DictionaryId);
            entity.ToTable("BondSpec");
            entity.Property(e => e.DictionaryId).ValueGeneratedNever();
            entity.Property(e => e.Isin).HasMaxLength(32);
            entity.Property(e => e.RegNumber).HasMaxLength(64);
            entity.Property(e => e.PlacementDate).HasColumnType("date");
            entity.Property(e => e.MaturityDate).HasColumnType("date");
            entity.Property(e => e.OfferDate).HasColumnType("date");
            entity.Property(e => e.NextCouponDate).HasColumnType("date");
            entity.Property(e => e.FaceValue).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.CouponValue).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.CouponRate).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.CouponType).HasMaxLength(32);
            entity.Property(e => e.AccruedInterest).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Currency).HasMaxLength(8);
            entity.Property(e => e.FaceUnit).HasMaxLength(8);
            entity.Property(e => e.MoexType).HasMaxLength(64);
            entity.Property(e => e.MoexGroup).HasMaxLength(64);
            entity.Property(e => e.BondClass).HasMaxLength(32);
            entity.Property(e => e.IsCouponed).HasColumnType("bit");
            entity.Property(e => e.IsForeignCurrency).HasColumnType("bit");
            entity.Property(e => e.PrimaryBoardId).HasMaxLength(16);
            entity.Property(e => e.IssueSize).HasColumnType("bigint");
            entity.Property(e => e.IssueSizePlaced).HasColumnType("bigint");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");
            entity.HasOne(d => d.Dictionary).WithOne()
                .HasForeignKey<BondSpec>(d => d.DictionaryId)
                .HasConstraintName("FK_BondSpec_Dictionary");
        });

        modelBuilder.Entity<BondMarketSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("BondMarketSnapshots");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.ImportedAt).HasColumnType("datetime2");
            entity.Property(e => e.BoardId).HasMaxLength(16);
            entity.Property(e => e.TradingStatus).HasMaxLength(32);
            entity.Property(e => e.PriceUnit).HasMaxLength(8);
            entity.Property(e => e.CurrencyId).HasMaxLength(8);
            entity.Property(e => e.PricePctOfPar).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.PriceRub).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.YieldPct).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.DayChangePct).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.DayVolume).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.AccruedInterest).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.CouponValue).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.NextCouponDate).HasColumnType("date");
            entity.Property(e => e.OfferDate).HasColumnType("date");
            entity.HasIndex(e => new { e.DictionaryId, e.ImportedAt });
            entity.HasOne(d => d.Dictionary).WithMany()
                .HasForeignKey(d => d.DictionaryId)
                .HasConstraintName("FK_BondMarketSnapshots_Dictionary");
        });

        modelBuilder.Entity<BondCoupon>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("BondCoupons");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.CouponDate).HasColumnType("date");
            entity.Property(e => e.CouponValue).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.CouponYieldPct).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.PercentOfPar).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.PercentOfMarket).HasColumnType("decimal(28, 10)");
            entity.HasIndex(e => new { e.DictionaryId, e.CouponDate });
            entity.HasOne(d => d.Dictionary).WithMany()
                .HasForeignKey(d => d.DictionaryId)
                .HasConstraintName("FK_BondCoupons_Dictionary");
        });

        modelBuilder.Entity<MoexSecurityType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("MoexSecurityTypes");
            entity.Property(e => e.Id).ValueGeneratedNever();
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.Title).HasMaxLength(512);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<FutureSpec>(entity =>
        {
            entity.HasKey(e => e.DictionaryId);
            entity.ToTable("FutureSpec");
            entity.Property(e => e.DictionaryId).ValueGeneratedNever();
            entity.Property(e => e.AssetCode).HasMaxLength(32);
            entity.Property(e => e.ExpirationDate).HasColumnType("date");
            entity.Property(e => e.MinStep).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.StepPrice).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");
            entity.HasOne(d => d.Dictionary).WithOne()
                .HasForeignKey<FutureSpec>(d => d.DictionaryId)
                .HasConstraintName("FK_FutureSpec_Dictionary");
        });

        modelBuilder.Entity<OptionSpec>(entity =>
        {
            entity.HasKey(e => e.DictionaryId);
            entity.ToTable("OptionSpec");
            entity.Property(e => e.DictionaryId).ValueGeneratedNever();
            entity.Property(e => e.AssetCode).HasMaxLength(32);
            entity.Property(e => e.OptionType).HasColumnType("char(1)");
            entity.Property(e => e.BoardId).HasMaxLength(16);
            entity.Property(e => e.Strike).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.TheorPrice).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Volat).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Last).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Bid).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Offer).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.VolToday).HasColumnType("bigint");
            entity.Property(e => e.OpenPosition).HasColumnType("bigint");
            entity.Property(e => e.UnderlyingPrice).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.ExpirationDate).HasColumnType("date");
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");
            entity.HasOne(d => d.Dictionary).WithOne()
                .HasForeignKey<OptionSpec>(d => d.DictionaryId)
                .HasConstraintName("FK_OptionSpec_Dictionary");
        });

        modelBuilder.Entity<OptionMarketSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("OptionMarketSnapshots");
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.ImportedAt).HasColumnType("datetime2");
            entity.Property(e => e.BoardId).HasMaxLength(16);
            entity.Property(e => e.OptionType).HasColumnType("char(1)");
            entity.Property(e => e.Strike).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.TheorPrice).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Volat).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Last).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Bid).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.Offer).HasColumnType("decimal(28, 10)");
            entity.Property(e => e.VolToday).HasColumnType("bigint");
            entity.Property(e => e.OpenPosition).HasColumnType("bigint");
            entity.Property(e => e.UnderlyingPrice).HasColumnType("decimal(28, 10)");
            entity.HasIndex(e => new { e.DictionaryId, e.ImportedAt });
            entity.HasOne(d => d.Dictionary).WithMany()
                .HasForeignKey(d => d.DictionaryId)
                .HasConstraintName("FK_OptionMarketSnapshots_Dictionary");
        });

        modelBuilder.Entity<SecurityLink>(entity =>
        {
            entity.HasKey(e => new { e.FromDictionaryId, e.ToDictionaryId, e.LinkType });
            entity.ToTable("SecurityLink");
            entity.Property(e => e.LinkType).HasColumnType("tinyint");
            entity.Property(e => e.Source).HasMaxLength(32);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");
            entity.HasIndex(e => e.ToDictionaryId);
            entity.HasOne(d => d.FromDictionary).WithMany()
                .HasForeignKey(d => d.FromDictionaryId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SecurityLink_Dictionary_From");
            entity.HasOne(d => d.ToDictionary).WithMany()
                .HasForeignKey(d => d.ToDictionaryId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SecurityLink_Dictionary_To");
        });

        modelBuilder.Entity<UnderlyingMap>(entity =>
        {
            entity.HasKey(e => e.AssetCode);
            entity.ToTable("UnderlyingMap");
            entity.Property(e => e.AssetCode).HasMaxLength(32);
            entity.Property(e => e.SpotSecId).HasMaxLength(32);
            entity.Property(e => e.UpdatedAt).HasColumnType("datetime2");
            entity.HasIndex(e => e.SpotSecId);
        });

        modelBuilder.Entity<ShareholderSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ShareholderSnapshots");
            entity.Property(e => e.ImportedAt).HasColumnType("datetime2");
            entity.Property(e => e.LastUpdateDate).HasColumnType("datetime2");
            entity.Property(e => e.Title).HasMaxLength(512);
            entity.HasIndex(e => new { e.DictionaryId, e.ImportedAt });
            entity.HasOne(d => d.Dictionary).WithMany()
                .HasForeignKey(d => d.DictionaryId)
                .HasConstraintName("FK_ShareholderSnapshots_Dictionary");
        });

        modelBuilder.Entity<ShareholderEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ShareholderEntries");
            entity.Property(e => e.Name).HasMaxLength(256);
            entity.Property(e => e.SharePercentage).HasColumnType("decimal(18, 6)");
            entity.HasIndex(e => new { e.SnapshotId, e.SortOrder });
            entity.HasOne(d => d.Snapshot).WithMany(p => p.Shareholders)
                .HasForeignKey(d => d.SnapshotId)
                .HasConstraintName("FK_ShareholderEntries_ShareholderSnapshots");
        });

        modelBuilder.Entity<RecommendationSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("RecommendationSnapshots");
            entity.Property(e => e.ImportedAt).HasColumnType("datetime2");
            entity.HasIndex(e => new { e.DictionaryId, e.ImportedAt });
            entity.HasOne(d => d.Dictionary).WithMany()
                .HasForeignKey(d => d.DictionaryId)
                .HasConstraintName("FK_RecommendationSnapshots_Dictionary");
        });

        modelBuilder.Entity<RecommendationReason>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("RecommendationReasons");
            entity.Property(e => e.Direction).HasConversion<byte>();
            entity.Property(e => e.Text).HasMaxLength(2000);
            entity.HasIndex(e => new { e.SnapshotId, e.Direction, e.SortOrder });
            entity.HasOne(d => d.Snapshot).WithMany(p => p.Reasons)
                .HasForeignKey(d => d.SnapshotId)
                .HasConstraintName("FK_RecommendationReasons_RecommendationSnapshots");
        });

        modelBuilder.Entity<Topic>(entity =>
        {
            entity.Property(e => e.Hide).HasDefaultValue(false);
        });

        modelBuilder.Entity<Lot>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("lot", t => t.ExcludeFromMigrations());
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
        modelBuilder.Entity<Market>()
            .ToTable("Market", t => t.ExcludeFromMigrations());
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
            entity.ToTable("MaxFullTrades", t => t.ExcludeFromMigrations());
        });
        modelBuilder.Entity<MaxTrade>(entity =>
        {
            entity.HasNoKey();
            entity.ToTable("MaxTrades", t => t.ExcludeFromMigrations());
            entity.HasIndex(e => e.Id, "ClusteredIndex-20230116-233135")
                .IsUnique()
                .IsClustered();
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MaxTime).HasColumnType("datetime");
        });
        modelBuilder.Entity<MigrationHistory>(entity =>
        {
            entity.HasKey(e => new { e.MigrationId, e.ContextKey }).HasName("PK_dbo.__MigrationHistory");
            entity.ToTable("__MigrationHistory", t => t.ExcludeFromMigrations());
            entity.Property(e => e.MigrationId).HasMaxLength(150);
            entity.Property(e => e.ContextKey).HasMaxLength(300);
            entity.Property(e => e.ProductVersion).HasMaxLength(32);
        });
        modelBuilder.Entity<MoexStruct>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("MoexStruct", t => t.ExcludeFromMigrations());
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
                .ToTable("shares", t => t.ExcludeFromMigrations());
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
                .ToTable("Structure", t => t.ExcludeFromMigrations());
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
                    tb.ExcludeFromMigrations();
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
            entity.ToTable("tradesEX", t => t.ExcludeFromMigrations());
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
            entity.ToTable("tradesbinance", tb =>
            {
                tb.ExcludeFromMigrations();
                tb.HasTrigger("autocandlebin");
            });
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
            entity.ToTable("SubscriptionPlans", t => t.ExcludeFromMigrations());
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
            entity.ToTable("TaxSettings", t => t.ExcludeFromMigrations());
            entity.Property(e => e.DiscountBefore).HasColumnType("datetime");
        });




        OnModelCreatingPartial(modelBuilder);
    }
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

