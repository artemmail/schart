# StockChart MCP Adapter (stdio)

This is a minimal MCP (Model Context Protocol) server that exposes the tools listed in `mcp.md`
by proxying to the StockChart REST API endpoints.

## Run

```powershell
$env:STOCKCHART_BASE_URL = "http://localhost:5000"   # or https://localhost:5001
$env:STOCKCHART_INSECURE_TLS = "1"                   # optional (for self-signed https)
python .\tools\mcp_adapter\stockchart_mcp_server.py
```

## Tools

- `list_markets()`
- `search_stocks(q?, marketCode?, sectorKey?, industryKey?, isActive?, limit=50, offset=0)`
- `list_sectors(marketCode?, limit=200, offset=0)`
- `list_industries(marketCode?, sectorKey?, limit=200, offset=0)`
- `list_metrics(q?, valueType?, unit?, statementType?, periodSupport?, limit=100, offset=0)`
- `statements_available(marketCode, ticker)`
- `statement_series(marketCode, ticker, metricKey, period="annual", standard?, mode?, limit=50)`
- `statement_series_batch(items[])` (max 50 items)

