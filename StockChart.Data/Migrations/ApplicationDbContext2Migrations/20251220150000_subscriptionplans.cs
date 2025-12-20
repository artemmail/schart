using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class subscriptionplans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SubscriptionPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Interval = table.Column<string>(type: "varchar(8)", unicode: false, maxLength: 8, nullable: false),
                    Count = table.Column<int>(type: "int", nullable: false),
                    OrdinalMoney = table.Column<decimal>(type: "money", nullable: false),
                    DiscountMoney = table.Column<decimal>(type: "money", nullable: false),
                    Code = table.Column<int>(type: "int", nullable: false),
                    IsReferal = table.Column<bool>(type: "bit", nullable: false),
                    ReferalInterval = table.Column<string>(type: "varchar(8)", unicode: false, maxLength: 8, nullable: true),
                    ReferalCount = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaxSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DiscountBefore = table.Column<DateTime>(type: "datetime", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SubscriptionPlans");

            migrationBuilder.DropTable(
                name: "TaxSettings");
        }
    }
}
