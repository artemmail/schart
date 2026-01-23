using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class prim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RecommendationSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecommendationSnapshots_Dictionary_DictionaryId",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShareholderSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    ImportedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LastUpdateDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareholderSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShareholderSnapshots_Dictionary_DictionaryId",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecommendationReasons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SnapshotId = table.Column<int>(type: "int", nullable: false),
                    Direction = table.Column<byte>(type: "tinyint", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecommendationReasons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecommendationReasons_RecommendationSnapshots_SnapshotId",
                        column: x => x.SnapshotId,
                        principalTable: "RecommendationSnapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShareholderEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SnapshotId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SharePercentage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareholderEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShareholderEntries_ShareholderSnapshots_SnapshotId",
                        column: x => x.SnapshotId,
                        principalTable: "ShareholderSnapshots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationReasons_SnapshotId",
                table: "RecommendationReasons",
                column: "SnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_RecommendationSnapshots_DictionaryId",
                table: "RecommendationSnapshots",
                column: "DictionaryId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareholderEntries_SnapshotId",
                table: "ShareholderEntries",
                column: "SnapshotId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareholderSnapshots_DictionaryId",
                table: "ShareholderSnapshots",
                column: "DictionaryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecommendationReasons");

            migrationBuilder.DropTable(
                name: "ShareholderEntries");

            migrationBuilder.DropTable(
                name: "RecommendationSnapshots");

            migrationBuilder.DropTable(
                name: "ShareholderSnapshots");
        }
    }
}
