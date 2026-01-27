using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StockChart.Data.Migrations.ApplicationDbContext2Migrations
{
    /// <inheritdoc />
    public partial class fin_st : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FinancialStatementEntries_DictionaryId_Standard_Period_Name_Year",
                table: "FinancialStatementEntries");

            migrationBuilder.AddColumn<int>(
                name: "MetricId",
                table: "FinancialStatementEntries",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "FinancialStatementDictionary",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsClickable",
                table: "FinancialStatementDictionary",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "SortGroup",
                table: "FinancialStatementDictionary",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tooltip",
                table: "FinancialStatementDictionary",
                type: "nvarchar(1024)",
                maxLength: 1024,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "FinancialStatementDictionary",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ValueType",
                table: "FinancialStatementDictionary",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "number");

            migrationBuilder.Sql(@"
                INSERT INTO FinancialStatementDictionary (Code, Value, IsClickable, ValueType, IsActive)
                SELECT DISTINCT e.Name, e.Name, 1, 'number', 1
                FROM FinancialStatementEntries e
                LEFT JOIN FinancialStatementDictionary d ON d.Code = e.Name
                WHERE d.Id IS NULL
                  AND e.Name IS NOT NULL
                  AND LTRIM(RTRIM(e.Name)) <> '';
            ");

            migrationBuilder.Sql(@"
                UPDATE e
                SET MetricId = d.Id
                FROM FinancialStatementEntries e
                INNER JOIN FinancialStatementDictionary d ON d.Code = e.Name
                WHERE e.MetricId = 0;
            ");

            migrationBuilder.Sql(@"
                UPDATE e
                SET MetricId = d.Id
                FROM FinancialStatementEntries e
                INNER JOIN FinancialStatementDictionary d ON d.Value = e.Name
                WHERE e.MetricId = 0;
            ");

            migrationBuilder.Sql(@"
                UPDATE FinancialStatementDictionary
                SET IsClickable = CASE WHEN ValueType = 'number' THEN 1 ELSE 0 END;
            ");

            migrationBuilder.Sql(@"
                ;WITH Stats AS (
                    SELECT
                        e.MetricId,
                        MAX(CASE WHEN e.ValueRaw LIKE 'http%' OR e.ValueRaw LIKE 'https%' OR e.ValueRaw LIKE 'file%' THEN 1 ELSE 0 END) AS HasUrl,
                        MAX(CASE WHEN e.ValueRaw LIKE '[0-9][0-9].[0-9][0-9].[0-9][0-9][0-9][0-9]' THEN 1 ELSE 0 END) AS HasDate,
                        MAX(CASE
                            WHEN e.ValueNum IS NULL
                                 AND NULLIF(LTRIM(RTRIM(REPLACE(e.ValueRaw, CHAR(160), ' '))), '') IS NOT NULL
                                 AND LTRIM(RTRIM(e.ValueRaw)) NOT IN ('-','—','N/A','NA')
                                 AND e.ValueRaw NOT LIKE 'http%'
                                 AND e.ValueRaw NOT LIKE 'https%'
                                 AND e.ValueRaw NOT LIKE 'file%'
                            THEN 1 ELSE 0 END) AS HasString
                    FROM FinancialStatementEntries e
                    GROUP BY e.MetricId
                )
                UPDATE d
                SET ValueType = CASE
                        WHEN s.HasUrl = 1 THEN 'url'
                        WHEN s.HasDate = 1 THEN 'date'
                        WHEN s.HasString = 1 THEN 'string'
                        ELSE 'number'
                    END,
                    IsClickable = CASE
                        WHEN s.HasUrl = 1 OR s.HasDate = 1 OR s.HasString = 1 THEN 0
                        ELSE 1
                    END
                FROM FinancialStatementDictionary d
                INNER JOIN Stats s ON s.MetricId = d.Id;
            ");

            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM FinancialStatementEntries WHERE MetricId = 0)
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM FinancialStatementDictionary WHERE Code = 'unknown')
                    BEGIN
                        INSERT INTO FinancialStatementDictionary (Code, Value, IsClickable, ValueType, IsActive)
                        VALUES ('unknown', 'Unknown', 0, 'string', 1);
                    END

                    UPDATE e
                    SET MetricId = d.Id
                    FROM FinancialStatementEntries e
                    CROSS JOIN (SELECT Id FROM FinancialStatementDictionary WHERE Code = 'unknown') d
                    WHERE e.MetricId = 0;
                END
            ");

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementEntries_DictionaryId_Standard_Period_MetricId_Year",
                table: "FinancialStatementEntries",
                columns: new[] { "DictionaryId", "Standard", "Period", "MetricId", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementEntries_MetricId",
                table: "FinancialStatementEntries",
                column: "MetricId");

            migrationBuilder.AddForeignKey(
                name: "FK_FinancialStatementEntries_Metric",
                table: "FinancialStatementEntries",
                column: "MetricId",
                principalTable: "FinancialStatementDictionary",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FinancialStatementEntries_Metric",
                table: "FinancialStatementEntries");

            migrationBuilder.DropIndex(
                name: "IX_FinancialStatementEntries_DictionaryId_Standard_Period_MetricId_Year",
                table: "FinancialStatementEntries");

            migrationBuilder.DropIndex(
                name: "IX_FinancialStatementEntries_MetricId",
                table: "FinancialStatementEntries");

            migrationBuilder.DropColumn(
                name: "MetricId",
                table: "FinancialStatementEntries");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "FinancialStatementDictionary");

            migrationBuilder.DropColumn(
                name: "IsClickable",
                table: "FinancialStatementDictionary");

            migrationBuilder.DropColumn(
                name: "SortGroup",
                table: "FinancialStatementDictionary");

            migrationBuilder.DropColumn(
                name: "Tooltip",
                table: "FinancialStatementDictionary");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "FinancialStatementDictionary");

            migrationBuilder.DropColumn(
                name: "ValueType",
                table: "FinancialStatementDictionary");

            migrationBuilder.CreateIndex(
                name: "IX_FinancialStatementEntries_DictionaryId_Standard_Period_Name_Year",
                table: "FinancialStatementEntries",
                columns: new[] { "DictionaryId", "Standard", "Period", "Name", "Year" },
                unique: true);
        }
    }
}
