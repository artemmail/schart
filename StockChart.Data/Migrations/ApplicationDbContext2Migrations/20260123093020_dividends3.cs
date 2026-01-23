using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class dividends3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DividendsMoex",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Datetime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DictionaryId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DividendsMoex", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DividendsMoex_Dictionary_DictionaryId",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DividendsMoexUpdateLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DividendsMoexUpdateLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DividendsMoexUpdateLogs_Dictionary_DictionaryId",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DividendsMoex_DictionaryId",
                table: "DividendsMoex",
                column: "DictionaryId");

            migrationBuilder.CreateIndex(
                name: "IX_DividendsMoexUpdateLogs_DictionaryId",
                table: "DividendsMoexUpdateLogs",
                column: "DictionaryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DividendsMoex");

            migrationBuilder.DropTable(
                name: "DividendsMoexUpdateLogs");
        }
    }
}
