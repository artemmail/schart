using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace StockChart.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class UserThings7 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_UserComment_TopicId",
                table: "UserComment",
                column: "TopicId");
            migrationBuilder.AddForeignKey(
                name: "FK_UserComment_Topic_TopicId",
                table: "UserComment",
                column: "TopicId",
                principalTable: "Topic",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserComment_Topic_TopicId",
                table: "UserComment");
            migrationBuilder.DropIndex(
                name: "IX_UserComment_TopicId",
                table: "UserComment");
        }
    }
}
