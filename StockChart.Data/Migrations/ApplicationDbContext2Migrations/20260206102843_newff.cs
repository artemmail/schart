using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class newff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BondClass",
                table: "BondSpec",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FaceUnit",
                table: "BondSpec",
                type: "nvarchar(8)",
                maxLength: 8,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCouponed",
                table: "BondSpec",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsForeignCurrency",
                table: "BondSpec",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MoexGroup",
                table: "BondSpec",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MoexType",
                table: "BondSpec",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BondClass",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "FaceUnit",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "IsCouponed",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "IsForeignCurrency",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "MoexGroup",
                table: "BondSpec");

            migrationBuilder.DropColumn(
                name: "MoexType",
                table: "BondSpec");
        }
    }
}
