using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class newb : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AccruedInterest",
                table: "BondSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CouponPeriodDays",
                table: "BondSpec",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CouponRate",
                table: "BondSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CouponType",
                table: "BondSpec",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CouponValue",
                table: "BondSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "IssueSize",
                table: "BondSpec",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "IssueSizePlaced",
                table: "BondSpec",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ListingLevel",
                table: "BondSpec",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextCouponDate",
                table: "BondSpec",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OfferDate",
                table: "BondSpec",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlacementDate",
                table: "BondSpec",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "QualifiedOnly",
                table: "BondSpec",
                type: "bit",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BondCoupons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    Number = table.Column<int>(type: "int", nullable: true),
                    CouponDate = table.Column<DateTime>(type: "date", nullable: true),
                    CouponValue = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    CouponYieldPct = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    PercentOfPar = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    PercentOfMarket = table.Column<decimal>(type: "decimal(28,10)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BondCoupons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BondCoupons_Dictionary",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BondMarketSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BoardId = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true),
                    TradingStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    PricePctOfPar = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    PriceRub = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    YieldPct = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    DayChangePct = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    DayVolume = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    DayVolumeQty = table.Column<long>(type: "bigint", nullable: true),
                    AccruedInterest = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    CouponValue = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    NextCouponDate = table.Column<DateTime>(type: "date", nullable: true),
                    OfferDate = table.Column<DateTime>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BondMarketSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BondMarketSnapshots_Dictionary",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BondCoupons_DictionaryId_CouponDate",
                table: "BondCoupons",
                columns: new[] { "DictionaryId", "CouponDate" });

            migrationBuilder.CreateIndex(
                name: "IX_BondMarketSnapshots_DictionaryId_ImportedAt",
                table: "BondMarketSnapshots",
                columns: new[] { "DictionaryId", "ImportedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BondCoupons");

            migrationBuilder.DropTable(
                name: "BondMarketSnapshots");

            migrationBuilder.DropColumn(
                name: "AccruedInterest",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "CouponPeriodDays",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "CouponRate",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "CouponType",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "CouponValue",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "IssueSize",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "IssueSizePlaced",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "ListingLevel",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "NextCouponDate",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "OfferDate",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "PlacementDate",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "QualifiedOnly",
                table: "BondSpec");
        }
    }
}
