using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StockChart.Model;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260131120000_option_underlying_price")]
    public partial class optionunderlyingprice : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "UnderlyingPrice",
                table: "OptionSpec",
                type: "decimal(28,10)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnderlyingPrice",
                table: "OptionMarketSnapshots",
                type: "decimal(28,10)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UnderlyingPrice",
                table: "OptionSpec");

            migrationBuilder.DropColumn(
                name: "UnderlyingPrice",
                table: "OptionMarketSnapshots");
        }
    }
}
