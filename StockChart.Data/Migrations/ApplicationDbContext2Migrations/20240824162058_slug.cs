using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class slug : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Topic",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Slug",
                table: "Topic");
        }
    }
}
