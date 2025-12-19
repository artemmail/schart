using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class ChartSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SelectedChartSettings_UserId",
                table: "SelectedChartSettings");

            migrationBuilder.AddColumn<bool>(
                name: "Selected",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_SelectedChartSettings_UserId",
                table: "SelectedChartSettings",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SelectedChartSettings_UserId",
                table: "SelectedChartSettings");

            migrationBuilder.DropColumn(
                name: "Selected",
                table: "ChartSettings");

            migrationBuilder.CreateIndex(
                name: "IX_SelectedChartSettings_UserId",
                table: "SelectedChartSettings",
                column: "UserId",
                unique: true);
        }
    }
}
