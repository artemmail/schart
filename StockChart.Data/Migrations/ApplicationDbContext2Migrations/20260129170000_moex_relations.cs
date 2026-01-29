using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StockChart.Model;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260129170000_moex_relations")]
    public partial class moexrelations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "emitent_id",
                table: "Dictionary",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "emitent_title",
                table: "Dictionary",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "emitent_inn",
                table: "Dictionary",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "emitent_id",
                table: "Dictionary");

            migrationBuilder.DropColumn(
                name: "emitent_title",
                table: "Dictionary");

            migrationBuilder.DropColumn(
                name: "emitent_inn",
                table: "Dictionary");
        }
    }
}
