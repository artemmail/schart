using System;
using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class UserThings4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Topic_AspNetUsers_UserId",
                table: "Topic");
            migrationBuilder.DropIndex(
                name: "IX_Topic_UserId",
                table: "Topic");
            migrationBuilder.AddColumn<Guid>(
                name: "ApplicationUser",
                table: "Topic",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
            migrationBuilder.CreateIndex(
                name: "IX_Topic_ApplicationUser",
                table: "Topic",
                column: "ApplicationUser");
            migrationBuilder.AddForeignKey(
                name: "FK_Topic_AspNetUsers_ApplicationUser",
                table: "Topic",
                column: "ApplicationUser",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Topic_AspNetUsers_ApplicationUser",
                table: "Topic");
            migrationBuilder.DropIndex(
                name: "IX_Topic_ApplicationUser",
                table: "Topic");
            migrationBuilder.DropColumn(
                name: "ApplicationUser",
                table: "Topic");
            migrationBuilder.CreateIndex(
                name: "IX_Topic_UserId",
                table: "Topic",
                column: "UserId");
            migrationBuilder.AddForeignKey(
                name: "FK_Topic_AspNetUsers_UserId",
                table: "Topic",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
