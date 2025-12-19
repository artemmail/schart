using System;
using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class UserThings9 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Topic_AspNetUsers_ApplicationUser",
                table: "Topic");
            migrationBuilder.DropForeignKey(
                name: "FK_UserComment_AspNetUsers_AspNetUser",
                table: "UserComment");
            migrationBuilder.DropForeignKey(
                name: "FK_UserGameOrder_AspNetUsers_AspNetUser",
                table: "UserGameOrder");
            migrationBuilder.DropIndex(
                name: "IX_UserGameOrder_AspNetUser",
                table: "UserGameOrder");
            migrationBuilder.DropIndex(
                name: "IX_UserComment_AspNetUser",
                table: "UserComment");
            migrationBuilder.DropIndex(
                name: "IX_Topic_ApplicationUser",
                table: "Topic");
            migrationBuilder.DropColumn(
                name: "AspNetUser",
                table: "UserGameOrder");
            migrationBuilder.DropColumn(
                name: "AspNetUser",
                table: "UserComment");
            migrationBuilder.DropColumn(
                name: "ApplicationUser",
                table: "Topic");
            migrationBuilder.CreateIndex(
                name: "IX_UserGameOrder_UserId",
                table: "UserGameOrder",
                column: "UserId");
            migrationBuilder.CreateIndex(
                name: "IX_UserComment_UserId",
                table: "UserComment",
                column: "UserId");
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
            migrationBuilder.AddForeignKey(
                name: "FK_UserComment_AspNetUsers_UserId",
                table: "UserComment",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_UserGameOrder_AspNetUsers_UserId",
                table: "UserGameOrder",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Topic_AspNetUsers_UserId",
                table: "Topic");
            migrationBuilder.DropForeignKey(
                name: "FK_UserComment_AspNetUsers_UserId",
                table: "UserComment");
            migrationBuilder.DropForeignKey(
                name: "FK_UserGameOrder_AspNetUsers_UserId",
                table: "UserGameOrder");
            migrationBuilder.DropIndex(
                name: "IX_UserGameOrder_UserId",
                table: "UserGameOrder");
            migrationBuilder.DropIndex(
                name: "IX_UserComment_UserId",
                table: "UserComment");
            migrationBuilder.DropIndex(
                name: "IX_Topic_UserId",
                table: "Topic");
            migrationBuilder.AddColumn<Guid>(
                name: "AspNetUser",
                table: "UserGameOrder",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
            migrationBuilder.AddColumn<Guid>(
                name: "AspNetUser",
                table: "UserComment",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
            migrationBuilder.AddColumn<Guid>(
                name: "ApplicationUser",
                table: "Topic",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
            migrationBuilder.CreateIndex(
                name: "IX_UserGameOrder_AspNetUser",
                table: "UserGameOrder",
                column: "AspNetUser");
            migrationBuilder.CreateIndex(
                name: "IX_UserComment_AspNetUser",
                table: "UserComment",
                column: "AspNetUser");
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
            migrationBuilder.AddForeignKey(
                name: "FK_UserComment_AspNetUsers_AspNetUser",
                table: "UserComment",
                column: "AspNetUser",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_UserGameOrder_AspNetUsers_AspNetUser",
                table: "UserGameOrder",
                column: "AspNetUser",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
