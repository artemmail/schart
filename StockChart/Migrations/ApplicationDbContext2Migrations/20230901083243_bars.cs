using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class bars : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {


            migrationBuilder.AddColumn<bool>(
                name: "DeltaBars",
                table: "ChartSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);


        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeltaBars",
                table: "ChartSettings");


        }
    }
}
