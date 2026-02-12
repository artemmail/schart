using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class mcp_conversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "McpConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LastMessagePreview = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastMessageAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_McpConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_McpConversations_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "McpConversationMessages",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Model = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    IsError = table.Column<bool>(type: "bit", nullable: false),
                    DataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SuggestionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_McpConversationMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_McpConversationMessages_McpConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "McpConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_McpConversationMessages_ConversationId_CreatedAt",
                table: "McpConversationMessages",
                columns: new[] { "ConversationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_McpConversations_UserId_UpdatedAt",
                table: "McpConversations",
                columns: new[] { "UserId", "UpdatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "McpConversationMessages");

            migrationBuilder.DropTable(
                name: "McpConversations");
        }
    }
}
