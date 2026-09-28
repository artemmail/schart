#!/usr/bin/env python3
"""
Import generated trades CSV files into SQL Server in 1000-row INSERT batches.

Expected CSV header:
ID;number;TradeDate;Price;Quantity;Volume;OI;Direction

Examples:
  python scripts/import_trades_csv.py 20260518moex_missing_market0_import.csv --execute
  python scripts/import_trades_csv.py 20260518futs_missing_market1_import.csv --execute
  python scripts/import_trades_csv.py 20260518moex_missing_market0_import.csv 20260518futs_missing_market1_import.csv --execute

The script prefers pyodbc when installed. If pyodbc is unavailable, it falls back
to PowerShell + System.Data.SqlClient, so no Python SQL package is required.
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterable, Iterator, Sequence


REQUIRED_COLUMNS = ("ID", "number", "TradeDate", "Price", "Quantity", "Volume", "OI", "Direction")
DEFAULT_CONNECTION_STRING = (
    "Data Source=localhost;"
    "Initial Catalog=stock;"
    "Integrated Security=True;"
    "TrustServerCertificate=True;"
    "Encrypt=False;"
    "Connect Timeout=30"
)


@dataclass(frozen=True)
class TradeRow:
    ticker_id: int
    number: int
    trade_date: str
    price: Decimal
    quantity: int
    volume: Decimal
    oi: int
    direction: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import generated trades CSV files into dbo.trades.")
    parser.add_argument("csv_files", nargs="+", type=Path, help="Generated CSV file(s) to import.")
    parser.add_argument("--server", default="localhost", help="SQL Server name for pyodbc mode.")
    parser.add_argument("--database", default="stock", help="SQL Server database for pyodbc mode.")
    parser.add_argument("--connection-string", default=None, help="ADO.NET/pyodbc connection string override.")
    parser.add_argument("--table", default="dbo.trades", help="Target table, default: dbo.trades.")
    parser.add_argument("--batch-size", type=int, default=1000, help="Rows per INSERT. SQL Server max is 1000.")
    parser.add_argument("--executor", choices=("auto", "pyodbc", "powershell"), default="auto")
    parser.add_argument("--powershell", default=None, help="powershell.exe or pwsh path override.")
    parser.add_argument("--command-timeout", type=int, default=300, help="SQL command timeout in seconds.")
    parser.add_argument("--skip-existing", action="store_true", help="Insert only rows whose ID+number do not exist.")
    parser.add_argument("--execute", action="store_true", help="Actually insert rows. Without this, only validates input.")
    parser.add_argument("--keep-sql", action="store_true", help="Keep generated SQL script in PowerShell mode.")
    parser.add_argument("--max-rows", type=int, default=0, help="For testing: stop after N rows across all files.")
    return parser.parse_args()


def quote_identifier(name: str) -> str:
    parts = [part.strip() for part in name.split(".") if part.strip()]
    if not parts:
        raise ValueError("empty SQL identifier")
    return ".".join(f"[{part.replace(']', ']]')}]" for part in parts)


def parse_int(value: str, field: str, line_number: int) -> int:
    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"line {line_number}: invalid {field}: {value!r}") from exc


def parse_decimal(value: str, field: str, line_number: int) -> Decimal:
    try:
        return Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"line {line_number}: invalid {field}: {value!r}") from exc


def parse_trade_date(value: str, line_number: int) -> str:
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    except ValueError as exc:
        raise ValueError(f"line {line_number}: invalid TradeDate: {value!r}") from exc
    return parsed.strftime("%Y-%m-%dT%H:%M:%S")


def normalize_decimal(value: Decimal) -> str:
    if not value.is_finite():
        raise ValueError(f"non-finite decimal: {value}")
    return format(value, "f")


def read_rows(csv_files: Sequence[Path], max_rows: int = 0) -> Iterator[TradeRow]:
    emitted = 0
    for path in csv_files:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, delimiter=";")
            if reader.fieldnames != list(REQUIRED_COLUMNS):
                raise ValueError(f"{path}: expected header {';'.join(REQUIRED_COLUMNS)}, got {reader.fieldnames}")

            for line_number, row in enumerate(reader, start=2):
                ticker_id = parse_int(row["ID"], "ID", line_number)
                number = parse_int(row["number"], "number", line_number)
                trade_date = parse_trade_date(row["TradeDate"], line_number)
                price = parse_decimal(row["Price"], "Price", line_number)
                quantity_raw = parse_decimal(row["Quantity"], "Quantity", line_number)
                volume = parse_decimal(row["Volume"], "Volume", line_number)
                oi = parse_int(row["OI"], "OI", line_number)
                direction = parse_int(row["Direction"], "Direction", line_number)

                if quantity_raw != quantity_raw.to_integral_value():
                    raise ValueError(f"line {line_number}: Quantity must be integral: {quantity_raw}")
                quantity = int(quantity_raw)
                if ticker_id <= 0 or number <= 0 or price <= 0 or quantity <= 0 or volume < 0:
                    raise ValueError(f"line {line_number}: non-positive ID/number/price/quantity or negative volume")
                if direction not in (0, 1):
                    raise ValueError(f"line {line_number}: Direction must be 0 or 1")

                yield TradeRow(ticker_id, number, trade_date, price, quantity, volume, oi, direction)
                emitted += 1
                if max_rows and emitted >= max_rows:
                    return


def row_sql(row: TradeRow) -> str:
    return (
        f"({row.ticker_id},"
        f"{row.number},"
        f"CAST('{row.trade_date}' AS datetime),"
        f"CAST({normalize_decimal(row.price)} AS decimal(18,6)),"
        f"{row.quantity},"
        f"CAST({normalize_decimal(row.volume)} AS decimal(18,6)),"
        f"{row.oi},"
        f"{row.direction})"
    )


def insert_statement(table: str, rows: Sequence[TradeRow], skip_existing: bool) -> str:
    values = ",\n".join(row_sql(row) for row in rows)
    table_name = quote_identifier(table)
    columns = "[ID], [number], [TradeDate], [Price], [Quantity], [Volume], [OI], [Direction]"

    if skip_existing:
        return f"""\
INSERT INTO {table_name} ({columns})
SELECT v.[ID], v.[number], v.[TradeDate], v.[Price], v.[Quantity], v.[Volume], v.[OI], v.[Direction]
FROM (VALUES
{values}
) AS v ([ID], [number], [TradeDate], [Price], [Quantity], [Volume], [OI], [Direction])
WHERE NOT EXISTS (
    SELECT 1
    FROM {table_name} AS t
    WHERE t.[ID] = v.[ID]
      AND t.[TradeDate] = v.[TradeDate]
      AND t.[number] = v.[number]
);"""

    return f"""\
INSERT INTO {table_name} ({columns})
VALUES
{values};"""


def transaction_batch(statement: str) -> str:
    return f"""\
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRAN;
{indent_sql(statement, "    ")}
    COMMIT;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH
"""


def indent_sql(sql: str, prefix: str) -> str:
    return "\n".join(prefix + line if line else line for line in sql.splitlines())


def batched(rows: Iterable[TradeRow], batch_size: int) -> Iterator[list[TradeRow]]:
    batch: list[TradeRow] = []
    for row in rows:
        batch.append(row)
        if len(batch) == batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


def make_pyodbc_connection_string(args: argparse.Namespace) -> str:
    if args.connection_string:
        return args.connection_string
    return (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        f"SERVER={args.server};"
        f"DATABASE={args.database};"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
        "Encrypt=no;"
    )


def make_ado_connection_string(args: argparse.Namespace) -> str:
    if args.connection_string:
        return args.connection_string
    return (
        f"Data Source={args.server};"
        f"Initial Catalog={args.database};"
        "Integrated Security=True;"
        "TrustServerCertificate=True;"
        "Encrypt=False;"
        "Connect Timeout=30"
    )


def choose_executor(args: argparse.Namespace) -> str:
    if args.executor != "auto":
        return args.executor
    if importlib.util.find_spec("pyodbc") is not None:
        return "pyodbc"
    return "powershell"


def execute_with_pyodbc(args: argparse.Namespace, sql_batches: Iterable[str]) -> int:
    import pyodbc  # type: ignore

    connection_string = make_pyodbc_connection_string(args)
    count = 0
    with pyodbc.connect(connection_string, autocommit=True) as connection:
        cursor = connection.cursor()
        cursor.timeout = args.command_timeout
        for count, sql in enumerate(sql_batches, start=1):
            cursor.execute(sql)
            if count % 50 == 0:
                print(f"executed batches: {count}", flush=True)
    return count


def find_powershell(explicit_path: str | None) -> str:
    if explicit_path:
        return explicit_path
    return shutil.which("pwsh") or shutil.which("powershell") or "powershell"


def write_sql_file(args: argparse.Namespace, sql_batches: Iterable[str]) -> tuple[Path, int]:
    fd, raw_path = tempfile.mkstemp(prefix="trades_import_", suffix=".sql", text=True)
    os.close(fd)
    sql_path = Path(raw_path)
    count = 0
    with sql_path.open("w", encoding="utf-8", newline="\n") as handle:
        for count, sql in enumerate(sql_batches, start=1):
            handle.write(sql)
            handle.write("\nGO\n")
            if count % 50 == 0:
                print(f"generated SQL batches: {count}", flush=True)
    return sql_path, count


def write_powershell_runner() -> Path:
    script = r"""
param(
    [Parameter(Mandatory=$true)][string]$SqlFile,
    [Parameter(Mandatory=$true)][string]$ConnectionString,
    [int]$CommandTimeout = 300
)

$ErrorActionPreference = 'Stop'
$connection = [System.Data.SqlClient.SqlConnection]::new($ConnectionString)
$connection.Open()
$reader = [System.IO.StreamReader]::new($SqlFile, [System.Text.Encoding]::UTF8, $true, 1048576)
$builder = [System.Text.StringBuilder]::new()
$batch = 0

function Invoke-Batch([string]$sql) {
    if ([string]::IsNullOrWhiteSpace($sql)) {
        return
    }

    $command = $connection.CreateCommand()
    $command.CommandTimeout = $CommandTimeout
    $command.CommandText = $sql
    [void]$command.ExecuteNonQuery()
}

try {
    while (($line = $reader.ReadLine()) -ne $null) {
        if ($line.Trim() -eq 'GO') {
            Invoke-Batch $builder.ToString()
            [void]$builder.Clear()
            $batch++
            if (($batch % 50) -eq 0) {
                Write-Host "executed batches: $batch"
            }
            continue
        }

        [void]$builder.AppendLine($line)
    }

    Invoke-Batch $builder.ToString()
}
finally {
    $reader.Dispose()
    $connection.Dispose()
}

Write-Host "executed batches: $batch"
"""
    fd, raw_path = tempfile.mkstemp(prefix="trades_import_runner_", suffix=".ps1", text=True)
    os.close(fd)
    path = Path(raw_path)
    path.write_text(script, encoding="utf-8")
    return path


def execute_with_powershell(args: argparse.Namespace, sql_batches: Iterable[str]) -> int:
    sql_path, batch_count = write_sql_file(args, sql_batches)
    runner_path = write_powershell_runner()
    powershell = find_powershell(args.powershell)
    connection_string = make_ado_connection_string(args)

    print(f"SQL script: {sql_path}", flush=True)
    try:
        subprocess.run(
            [
                powershell,
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(runner_path),
                "-SqlFile",
                str(sql_path),
                "-ConnectionString",
                connection_string,
                "-CommandTimeout",
                str(args.command_timeout),
            ],
            check=True,
        )
    finally:
        runner_path.unlink(missing_ok=True)
        if args.keep_sql:
            print(f"kept SQL script: {sql_path}", flush=True)
        else:
            sql_path.unlink(missing_ok=True)

    return batch_count


def build_sql_batches(args: argparse.Namespace) -> Iterator[str]:
    rows = read_rows(args.csv_files, max_rows=args.max_rows)
    for batch in batched(rows, args.batch_size):
        yield transaction_batch(insert_statement(args.table, batch, args.skip_existing))


def validate_args(args: argparse.Namespace) -> None:
    if args.batch_size < 1 or args.batch_size > 1000:
        raise ValueError("--batch-size must be between 1 and 1000")
    for csv_file in args.csv_files:
        if not csv_file.exists():
            raise FileNotFoundError(csv_file)


def main() -> int:
    args = parse_args()
    validate_args(args)

    if not args.execute:
        rows = 0
        for _ in read_rows(args.csv_files, max_rows=args.max_rows):
            rows += 1
            if rows % 100000 == 0:
                print(f"validated rows: {rows}", flush=True)
        print(f"dry-run complete: validated {rows} rows. Add --execute to insert.", flush=True)
        return 0

    executor = choose_executor(args)
    print(f"executor: {executor}", flush=True)

    if executor == "pyodbc":
        batch_count = execute_with_pyodbc(args, build_sql_batches(args))
    elif executor == "powershell":
        batch_count = execute_with_powershell(args, build_sql_batches(args))
    else:
        raise ValueError(f"unsupported executor: {executor}")

    print(f"import complete: executed {batch_count} INSERT batches", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
