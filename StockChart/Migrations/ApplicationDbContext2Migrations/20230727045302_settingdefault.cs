using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class settingdefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SelectedChartSettings");

            migrationBuilder.AddColumn<bool>(
                name: "Default",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSelection",
                table: "ChartSettings",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "LastUpdate",
                table: "ChartSettings",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Default",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "LastSelection",
                table: "ChartSettings");

            migrationBuilder.DropColumn(
                name: "LastUpdate",
                table: "ChartSettings");

            migrationBuilder.CreateTable(
                name: "SelectedChartSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ChartSettingsId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SelectedChartSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SelectedChartSettings_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SelectedChartSettings_ChartSettings_ChartSettingsId",
                        column: x => x.ChartSettingsId,
                        principalTable: "ChartSettings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SelectedChartSettings_ChartSettingsId",
                table: "SelectedChartSettings",
                column: "ChartSettingsId");

            migrationBuilder.CreateIndex(
                name: "IX_SelectedChartSettings_UserId",
                table: "SelectedChartSettings",
                column: "UserId");
        }
    }
}
