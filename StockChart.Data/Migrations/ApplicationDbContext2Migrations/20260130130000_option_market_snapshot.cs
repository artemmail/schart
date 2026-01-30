using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StockChart.Model;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260130130000_option_market_snapshot")]
    public partial class optionmarketsnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BoardId",
                table: "OptionSpec",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TheorPrice",
                table: "OptionSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Volat",
                table: "OptionSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Last",
                table: "OptionSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Bid",
                table: "OptionSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Offer",
                table: "OptionSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "VolToday",
                table: "OptionSpec",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "OpenPosition",
                table: "OptionSpec",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OptionMarketSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BoardId = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true),
                    OptionType = table.Column<string>(type: "char(1)", nullable: true),
                    Strike = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    TheorPrice = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    Volat = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    Last = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    Bid = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    Offer = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    VolToday = table.Column<long>(type: "bigint", nullable: true),
                    OpenPosition = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OptionMarketSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OptionMarketSnapshots_Dictionary",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OptionMarketSnapshots_DictionaryId_ImportedAt",
                table: "OptionMarketSnapshots",
                columns: new[] { "DictionaryId", "ImportedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OptionMarketSnapshots");

            migrationBuilder.DropColumn(
                name: "BoardId",
                table: "OptionSpec");

            migrationBuilder.DropColumn(
                name: "TheorPrice",
                table: "OptionSpec");

            migrationBuilder.DropColumn(
                name: "Volat",
                table: "OptionSpec");

            migrationBuilder.DropColumn(
                name: "Last",
                table: "OptionSpec");

            migrationBuilder.DropColumn(
                name: "Bid",
                table: "OptionSpec");

            migrationBuilder.DropColumn(
                name: "Offer",
                table: "OptionSpec");

            migrationBuilder.DropColumn(
                name: "VolToday",
                table: "OptionSpec");

            migrationBuilder.DropColumn(
                name: "OpenPosition",
                table: "OptionSpec");
        }
    }
}
