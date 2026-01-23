using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class prim2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FinancialStatementDictionary",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinancialStatementDictionary", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FinancialStatementSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    Standard = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    Period = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: true),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinancialStatementSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FinancialStatementSnapshots_Dictionary",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FinancialStatementEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SnapshotId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Year = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ValueRaw = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ValueNum = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinancialStatementEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FinancialStatementEntries_FinancialStatementSnapshots",
                        column: x => x.SnapshotId,
                        principalTable: "FinancialStatementSnapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementDictionary_Code",
                table: "FinancialStatementDictionary",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementEntries_SnapshotId_SortOrder",
                table: "FinancialStatementEntries",
                columns: new[] { "SnapshotId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementSnapshots_DictionaryId_Standard_Period_Mode_ImportedAt",
                table: "FinancialStatementSnapshots",
                columns: new[] { "DictionaryId", "Standard", "Period", "Mode", "ImportedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FinancialStatementDictionary");

            migrationBuilder.DropTable(
                name: "FinancialStatementEntries");

            migrationBuilder.DropTable(
                name: "FinancialStatementSnapshots");
        }
    }
}
