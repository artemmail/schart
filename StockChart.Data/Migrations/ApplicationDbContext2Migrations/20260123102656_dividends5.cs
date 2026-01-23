using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class dividends5 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DividendsMoex_Dictionary_DictionaryId",
                table: "DividendsMoex");

            migrationBuilder.AlterColumn<int>(
                name: "DictionaryId",
                table: "DividendsMoex",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_DividendsMoex_Dictionary_DictionaryId",
                table: "DividendsMoex",
                column: "DictionaryId",
                principalTable: "Dictionary",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DividendsMoex_Dictionary_DictionaryId",
                table: "DividendsMoex");

            migrationBuilder.AlterColumn<int>(
                name: "DictionaryId",
                table: "DividendsMoex",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_DividendsMoex_Dictionary_DictionaryId",
                table: "DividendsMoex",
                column: "DictionaryId",
                principalTable: "Dictionary",
                principalColumn: "Id");
        }
    }
}
