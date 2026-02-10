# StockChart MCP Adapter (stdio)

This is a minimal MCP (Model Context Protocol) server that exposes tools and resources listed in `mcp.md`
by proxying to the StockChart REST API endpoints.

## Run

```powershell
$env:STOCKCHART_BASE_URL = "http://localhost:5253"   # set to your StockChart REST API base URL (this repo: HTTP on :5253)
$env:STOCKCHART_INSECURE_TLS = "1"                   # optional (for self-signed https)
$env:STOCKCHART_DEFAULT_CANDLES_PROFILE = "close"    # optional: close|ohlc|ohlcv
$env:STOCKCHART_DEFAULT_LIST_PROFILE = "full"        # optional: brief|base|full
python .\tools\mcp_adapter\stockchart_mcp_server.py
```

Or run the helper script:

```powershell
.\tools\mcp_adapter\run.ps1
```

## Tools

- `list_markets(profile?, fields?)`
- `search_stocks(q?, marketCode?, sectorKey?, industryKey?, isActive?, limit=50, offset=0, profile?, fields?)`
- `list_sectors(marketCode?, limit=200, offset=0, profile?, fields?)`
- `list_industries(marketCode?, sectorKey?, limit=200, offset=0, profile?, fields?)`
- `list_metrics(q?, valueType?, unit?, statementType?, periodSupport?, limit=100, offset=0, profile?, fields?)`
- `statements_available(marketCode, ticker)`
- `statement_series(marketCode, ticker, metricKey, period="annual", standard?, mode?, limit=50)`
- `statement_series_batch(items[])` (max 50 items)
- `candles_series(ticker, period, startDate?, endDate?, limit=500, fields?)` (fields: `t,c` default; groups: `ohlc`, `vol`, `bidask`, `oi`, `all`)
- `candles_series_batch(tickers[], period, startDate?, endDate?, limit=500, profile?, fields?, continueOnError=true)` (new, does not change single-ticker `candles_series`)
- `market_leaders(startDate?, endDate?, rperiod="day", top=20, market=0, dir=0, profile?, fields?)` (`dir=0` volume leaders, `1` gainers, `2` losers)
- `volume_splash(bigPeriod, smallPeriod, splash=3, market=0, ticker?, tickers[]?, topN?, profile?, fields?)` (volume burst scanner via `api/Reports/VolumeSplash`; compact AI output)
- `portfolio_markowitz(tickers[], startDate, endDate, risk, mode?, riskFreeRate?, minWeight?, maxWeight?, sectorMaxWeights?, topN?, profile?, fields?)` (read-only Markowitz; uses `api/Portfolio/MarkovitzMcp`)
- `fractal_barometer(ticker?, tickers[]?, market=0, topN?, includeCodes=false)` (compact Fractal Barometer; supports one ticker, list, or market snapshot via `api/Reports/Barometer`; `topN` applies to market snapshot mode)
- `dividends(ticker)`

`marketCode` note: API expects numeric string codes (`0` stocks, `1` futures, `2` bonds, `7` options).  
Adapter also accepts common aliases (`MOEX`, `stocks`, `shares`, `bonds`, `futures`, `options`) and maps them automatically.

List projection options:

- `profile`: `brief|base|full`
- `fields`: comma-separated field names (overrides `profile`)

Candles batch profile options:

- `close` -> `t,c`
- `ohlc` -> `t,o,h,l,c`
- `ohlcv` -> `t,o,h,l,c,v`

Markowitz projection options:

- `profile`: `brief|full` (`brief` excludes `chart`)
- `fields`: `success,actual,stddev,chart` (comma-separated; overrides `profile`)
- `mode`: `min_variance|max_return|max_sharpe`
- `risk` semantics:
- `min_variance`: target return
- `max_return` / `max_sharpe`: max allowed portfolio stddev
- `riskFreeRate`: used by `max_sharpe`
- `minWeight`, `maxWeight`: per-asset bounds in `[0,1]`
- `sectorMaxWeights`: CSV `sectorKey:weight`, e.g. `1:0.4,2:0.3`

Fractal barometer output format:

- `items[]`: compact rows with `ticker`, `name`, `price`, `score`, `bias`, `signals`
- `signals`: `m60`, `d1`, `w1` in enum form (`long_open`, `long_hold`, `long_reduce`, `flat`, `short_reduce`, `short_hold`, `short_open`)
- `summary`: counts by bias (`bullish`, `bearish`, `neutral`) and `missing` tickers when list is requested

Volume splash projection/output:

- `profile`: `brief|base|full` (`base` default)
- `fields`: `ticker,name,price,splash,maxVolume,avgVolume` (comma-separated; overrides `profile`)
- `items[]`: compact rows sorted by `splash` descending (or requested ticker order)
- `summary`: `count`, periods, threshold, and `missing` tickers when list is requested

## Resources

Static resource URIs:

- `stockchart://meta/markets`
- `stockchart://meta/sectors`
- `stockchart://meta/industries`
- `stockchart://meta/metrics`
- `stockchart://docs/tooling`

Resource URI templates:

- `stockchart://candles/{ticker}/{period}`
- `stockchart://dividends/{ticker}`
- `stockchart://statements/available/{marketCode}/{ticker}`
- `stockchart://statements/series/{marketCode}/{ticker}/{metricKey}`

Optional query params:

- `stockchart://candles/{ticker}/{period}?startDate=&endDate=&limit=&fields=`
- `stockchart://statements/series/{marketCode}/{ticker}/{metricKey}?period=&standard=&mode=&limit=`
