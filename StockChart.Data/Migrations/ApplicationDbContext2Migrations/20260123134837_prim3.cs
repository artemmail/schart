using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class prim3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FinancialStatementEntries_FinancialStatementSnapshots",
                table: "FinancialStatementEntries");

            migrationBuilder.DropTable(
                name: "FinancialStatementSnapshots");

            migrationBuilder.DropIndex(
                name: "IX_FinancialStatementEntries_SnapshotId_SortOrder",
                table: "FinancialStatementEntries");

            migrationBuilder.RenameColumn(
                name: "SnapshotId",
                table: "FinancialStatementEntries",
                newName: "DictionaryId");

            migrationBuilder.AddColumn<DateTime>(
                name: "ImportedAt",
                table: "FinancialStatementEntries",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Period",
                table: "FinancialStatementEntries",
                type: "nvarchar(4)",
                maxLength: 4,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Standard",
                table: "FinancialStatementEntries",
                type: "nvarchar(8)",
                maxLength: 8,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementEntries_DictionaryId_Standard_Period_Name_Year",
                table: "FinancialStatementEntries",
                columns: new[] { "DictionaryId", "Standard", "Period", "Name", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementEntries_DictionaryId_Standard_Period_SortOrder",
                table: "FinancialStatementEntries",
                columns: new[] { "DictionaryId", "Standard", "Period", "SortOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_FinancialStatementEntries_Dictionary",
                table: "FinancialStatementEntries",
                column: "DictionaryId",
                principalTable: "Dictionary",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FinancialStatementEntries_Dictionary",
                table: "FinancialStatementEntries");

            migrationBuilder.DropIndex(
                name: "IX_FinancialStatementEntries_DictionaryId_Standard_Period_Name_Year",
                table: "FinancialStatementEntries");

            migrationBuilder.DropIndex(
                name: "IX_FinancialStatementEntries_DictionaryId_Standard_Period_SortOrder",
                table: "FinancialStatementEntries");

            migrationBuilder.DropColumn(
                name: "ImportedAt",
                table: "FinancialStatementEntries");

            migrationBuilder.DropColumn(
                name: "Period",
                table: "FinancialStatementEntries");

            migrationBuilder.DropColumn(
                name: "Standard",
                table: "FinancialStatementEntries");

            migrationBuilder.RenameColumn(
                name: "DictionaryId",
                table: "FinancialStatementEntries",
                newName: "SnapshotId");

            migrationBuilder.CreateTable(
                name: "FinancialStatementSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Mode = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: true),
                    Period = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    Standard = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementEntries_SnapshotId_SortOrder",
                table: "FinancialStatementEntries",
                columns: new[] { "SnapshotId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementSnapshots_DictionaryId_Standard_Period_Mode_ImportedAt",
                table: "FinancialStatementSnapshots",
                columns: new[] { "DictionaryId", "Standard", "Period", "Mode", "ImportedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_FinancialStatementEntries_FinancialStatementSnapshots",
                table: "FinancialStatementEntries",
                column: "SnapshotId",
                principalTable: "FinancialStatementSnapshots",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
