using System;
using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class UserThings2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Topic_AspNetUsers_ApplicationUserId",
                table: "Topic");
            migrationBuilder.DropForeignKey(
                name: "FK_UserGameOrder_AspNetUsers_UserId",
                table: "UserGameOrder");
            migrationBuilder.DropTable(
                name: "TopicComment");
            migrationBuilder.DropIndex(
                name: "IX_UserGameOrder_UserId",
                table: "UserGameOrder");
            migrationBuilder.DropIndex(
                name: "IX_Topic_ApplicationUserId",
                table: "Topic");
            migrationBuilder.DropColumn(
                name: "ApplicationUserId",
                table: "Topic");
            migrationBuilder.AddColumn<Guid>(
                name: "AspNetUser",
                table: "UserGameOrder",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
            migrationBuilder.CreateIndex(
                name: "IX_UserGameOrder_AspNetUser",
                table: "UserGameOrder",
                column: "AspNetUser");
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
                name: "FK_UserGameOrder_AspNetUsers_AspNetUser",
                table: "UserGameOrder",
                column: "AspNetUser",
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
                name: "FK_UserGameOrder_AspNetUsers_AspNetUser",
                table: "UserGameOrder");
            migrationBuilder.DropIndex(
                name: "IX_UserGameOrder_AspNetUser",
                table: "UserGameOrder");
            migrationBuilder.DropIndex(
                name: "IX_Topic_UserId",
                table: "Topic");
            migrationBuilder.DropColumn(
                name: "AspNetUser",
                table: "UserGameOrder");
            migrationBuilder.AddColumn<Guid>(
                name: "ApplicationUserId",
                table: "Topic",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
            migrationBuilder.CreateTable(
                name: "TopicComment",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TopiId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TopicComment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TopicComment_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TopicComment_Topic_TopiId",
                        column: x => x.TopiId,
                        principalTable: "Topic",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
            migrationBuilder.CreateIndex(
                name: "IX_UserGameOrder_UserId",
                table: "UserGameOrder",
                column: "UserId");
            migrationBuilder.CreateIndex(
                name: "IX_Topic_ApplicationUserId",
                table: "Topic",
                column: "ApplicationUserId");
            migrationBuilder.CreateIndex(
                name: "IX_TopicComment_TopiId",
                table: "TopicComment",
                column: "TopiId");
            migrationBuilder.CreateIndex(
                name: "IX_TopicComment_UserId",
                table: "TopicComment",
                column: "UserId");
            migrationBuilder.AddForeignKey(
                name: "FK_Topic_AspNetUsers_ApplicationUserId",
                table: "Topic",
                column: "ApplicationUserId",
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
    }
}
