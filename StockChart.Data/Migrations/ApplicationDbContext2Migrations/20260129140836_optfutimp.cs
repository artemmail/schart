using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class optfutimp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BondSpec",
                columns: table => new
                {
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    Isin = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    RegNumber = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    MaturityDate = table.Column<DateTime>(type: "date", nullable: true),
                    FaceValue = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    Currency = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: true),
                    PrimaryBoardId = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BondSpec", x => x.DictionaryId);
                    table.ForeignKey(
                        name: "FK_BondSpec_Dictionary",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FutureSpec",
                columns: table => new
                {
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    AssetCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    ExpirationDate = table.Column<DateTime>(type: "date", nullable: true),
                    LotSize = table.Column<int>(type: "int", nullable: true),
                    MinStep = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    StepPrice = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FutureSpec", x => x.DictionaryId);
                    table.ForeignKey(
                        name: "FK_FutureSpec_Dictionary",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OptionSpec",
                columns: table => new
                {
                    DictionaryId = table.Column<int>(type: "int", nullable: false),
                    AssetCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    OptionType = table.Column<string>(type: "char(1)", nullable: true),
                    Strike = table.Column<decimal>(type: "decimal(28,10)", nullable: true),
                    ExpirationDate = table.Column<DateTime>(type: "date", nullable: true),
                    LotSize = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OptionSpec", x => x.DictionaryId);
                    table.ForeignKey(
                        name: "FK_OptionSpec_Dictionary",
                        column: x => x.DictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SecurityLink",
                columns: table => new
                {
                    FromDictionaryId = table.Column<int>(type: "int", nullable: false),
                    ToDictionaryId = table.Column<int>(type: "int", nullable: false),
                    LinkType = table.Column<byte>(type: "tinyint", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityLink", x => new { x.FromDictionaryId, x.ToDictionaryId, x.LinkType });
                    table.ForeignKey(
                        name: "FK_SecurityLink_Dictionary_From",
                        column: x => x.FromDictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SecurityLink_Dictionary_To",
                        column: x => x.ToDictionaryId,
                        principalTable: "Dictionary",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UnderlyingMap",
                columns: table => new
                {
                    AssetCode = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    SpotSecId = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnderlyingMap", x => x.AssetCode);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityLink_ToDictionaryId",
                table: "SecurityLink",
                column: "ToDictionaryId");

            migrationBuilder.CreateIndex(
                name: "IX_UnderlyingMap_SpotSecId",
                table: "UnderlyingMap",
                column: "SpotSecId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BondSpec");

            migrationBuilder.DropTable(
                name: "FutureSpec");

            migrationBuilder.DropTable(
                name: "OptionSpec");

            migrationBuilder.DropTable(
                name: "SecurityLink");

            migrationBuilder.DropTable(
                name: "UnderlyingMap");
        }
    }
}
