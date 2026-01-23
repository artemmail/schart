using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class dividends6 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DividendsMoexUpdateLogs_Dictionary_DictionaryId",
                table: "DividendsMoexUpdateLogs");

            migrationBuilder.DropIndex(
                name: "IX_DividendsMoexUpdateLogs_DictionaryId",
                table: "DividendsMoexUpdateLogs");

            migrationBuilder.DropColumn(
                name: "DictionaryId",
                table: "DividendsMoexUpdateLogs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DictionaryId",
                table: "DividendsMoexUpdateLogs",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DividendsMoexUpdateLogs_DictionaryId",
                table: "DividendsMoexUpdateLogs",
                column: "DictionaryId");

            migrationBuilder.AddForeignKey(
                name: "FK_DividendsMoexUpdateLogs_Dictionary_DictionaryId",
                table: "DividendsMoexUpdateLogs",
                column: "DictionaryId",
                principalTable: "Dictionary",
                principalColumn: "Id");
        }
    }
}
