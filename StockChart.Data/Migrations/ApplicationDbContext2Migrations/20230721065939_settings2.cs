using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class settings2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Bars",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CandlesOnly",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CompressToCandles",
                table: "ChartSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "Contracts",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Delta",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Head",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "MaxTrades",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "OI",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "OIDelta",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "OpenClose",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Postmarket",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SeparateVolume",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShrinkY",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ToolTip",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "TopVolumes",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "classic",
                table: "ChartSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "deltaStyle",
                table: "ChartSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "horizStyle",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "oiEnable",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "style",
                table: "ChartSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "totalMode",
                table: "ChartSettings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "volume1",
                table: "ChartSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "volume2",
                table: "ChartSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bars",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "CandlesOnly",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "CompressToCandles",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "Contracts",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "Delta",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "Head",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "MaxTrades",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "OI",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "OIDelta",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "OpenClose",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "Postmarket",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "SeparateVolume",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "ShrinkY",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "ToolTip",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "TopVolumes",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "classic",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "deltaStyle",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "horizStyle",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "oiEnable",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "style",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "totalMode",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "volume1",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "volume2",
                table: "ChartSettings");
        }
    }
}
