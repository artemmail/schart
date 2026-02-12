using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class mcp_provider_state : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProviderApiMode",
                table: "McpConversations",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderConversationId",
                table: "McpConversations",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderLastResponseId",
                table: "McpConversations",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderStateJson",
                table: "McpConversations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderMessageId",
                table: "McpConversationMessages",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TraceJson",
                table: "McpConversationMessages",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProviderApiMode",
                table: "McpConversations");

            migrationBuilder.DropColumn(
                name: "ProviderConversationId",
                table: "McpConversations");

            migrationBuilder.DropColumn(
                name: "ProviderLastResponseId",
                table: "McpConversations");

            migrationBuilder.DropColumn(
                name: "ProviderStateJson",
                table: "McpConversations");

            migrationBuilder.DropColumn(
                name: "ProviderMessageId",
                table: "McpConversationMessages");

            migrationBuilder.DropColumn(
                name: "TraceJson",
                table: "McpConversationMessages");
        }
    }
}
