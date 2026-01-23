using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class dividends4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DividendsMoexUpdateLogs_Dictionary_DictionaryId",
                table: "DividendsMoexUpdateLogs");

            migrationBuilder.AlterColumn<int>(
                name: "DictionaryId",
                table: "DividendsMoexUpdateLogs",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "Failed",
                table: "DividendsMoexUpdateLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Succ",
                table: "DividendsMoexUpdateLogs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_DividendsMoexUpdateLogs_Dictionary_DictionaryId",
                table: "DividendsMoexUpdateLogs",
                column: "DictionaryId",
                principalTable: "Dictionary",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DividendsMoexUpdateLogs_Dictionary_DictionaryId",
                table: "DividendsMoexUpdateLogs");

            migrationBuilder.DropColumn(
                name: "Failed",
                table: "DividendsMoexUpdateLogs");

            migrationBuilder.DropColumn(
                name: "Succ",
                table: "DividendsMoexUpdateLogs");

            migrationBuilder.AlterColumn<int>(
                name: "DictionaryId",
                table: "DividendsMoexUpdateLogs",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_DividendsMoexUpdateLogs_Dictionary_DictionaryId",
                table: "DividendsMoexUpdateLogs",
                column: "DictionaryId",
                principalTable: "Dictionary",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
