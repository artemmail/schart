using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class DialogPositions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DialogPositions",
                table: "ChartSettings",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DialogPositions",
                table: "ChartSettings");
        }
    }
}
