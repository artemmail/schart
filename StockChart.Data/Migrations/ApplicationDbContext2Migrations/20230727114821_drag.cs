using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class drag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VolumesHeight0",
                table: "ChartSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "VolumesHeight1",
                table: "ChartSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "VolumesHeight2",
                table: "ChartSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "VolumesHeight3",
                table: "ChartSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "VolumesHeight4",
                table: "ChartSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "VolumesHeight5",
                table: "ChartSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VolumesHeight0",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "VolumesHeight1",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "VolumesHeight2",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "VolumesHeight3",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "VolumesHeight4",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "VolumesHeight5",
                table: "ChartSettings");
        }
    }
}
