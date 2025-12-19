using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class open_pos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OpenPositions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    JuridicalLong = table.Column<long>(type: "bigint", nullable: false),
                    JuridicalShort = table.Column<long>(type: "bigint", nullable: false),
                    PhysicalLong = table.Column<long>(type: "bigint", nullable: false),
                    PhysicalShort = table.Column<long>(type: "bigint", nullable: false),
                    JuridicalLongDelta = table.Column<long>(type: "bigint", nullable: false),
                    JuridicalShortDelta = table.Column<long>(type: "bigint", nullable: false),
                    PhysicalLongDelta = table.Column<long>(type: "bigint", nullable: false),
                    PhysicalShortDelta = table.Column<long>(type: "bigint", nullable: false),
                    JuridicalLongCount = table.Column<int>(type: "int", nullable: false),
                    JuridicalShortCount = table.Column<int>(type: "int", nullable: false),
                    PhysicalLongCount = table.Column<int>(type: "int", nullable: false),
                    PhysicalShortCount = table.Column<int>(type: "int", nullable: false),
                    ContractName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OpenPositions", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OpenPositions");
        }
    }
}
