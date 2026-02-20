using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class topic_likes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TopicLike",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TopicId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TopicLike", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TopicLike_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TopicLike_Topic_TopicId",
                        column: x => x.TopicId,
                        principalTable: "Topic",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TopicLike_TopicId_UserId",
                table: "TopicLike",
                columns: new[] { "TopicId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TopicLike_UserId",
                table: "TopicLike",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TopicLike");
        }
    }
}
