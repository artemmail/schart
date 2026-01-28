#!/usr/bin/env python3
# Minimal MCP (Model Context Protocol) stdio server exposing StockChart economic/fundamental tools (see mcp.md).
#
# Transport: newline-delimited JSON-RPC (per MCP transports spec).
# This server only implements: initialize, tools/list, tools/call.
#
# Configuration:
#   STOCKCHART_BASE_URL (default: http://localhost:5000)
#   STOCKCHART_TIMEOUT_SEC (default: 30)
#   STOCKCHART_INSECURE_TLS=1  (disable TLS verification for https localhost dev)

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple


PROTOCOL_VERSIONS_SUPPORTED = ["2025-03-26", "2024-11-05"]

def _ensure_utf8_stdio() -> None:
    # MCP transports are UTF-8; ensure Windows stdio can emit Cyrillic without crashing.
    # Without this, tool results containing non-ASCII (e.g. Russian names) can raise
    # UnicodeEncodeError and terminate the process ("Transport closed" in the host).
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _eprint(*args: object) -> None:
    print(*args, file=sys.stderr, flush=True)


def _json_dumps_one_line(obj: Any) -> str:
    # Ensure the MCP transport requirement: no embedded newlines in the JSON-RPC message.
    # (The "text" fields may contain newlines; json.dumps will escape them.)
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def _send(msg: Dict[str, Any]) -> None:
    sys.stdout.write(_json_dumps_one_line(msg) + "\n")
    sys.stdout.flush()


def _jsonrpc_error(req_id: Any, code: int, message: str, data: Any = None) -> Dict[str, Any]:
    err: Dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        err["data"] = data
    return {"jsonrpc": "2.0", "id": req_id, "error": err}


def _jsonrpc_result(req_id: Any, result: Any) -> Dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _tool_result_json(data: Any, is_error: bool = False) -> Dict[str, Any]:
    # MCP tool result content supports "text"; encode JSON as text for maximum compatibility.
    text = json.dumps(data, ensure_ascii=False, indent=2)
    return {"content": [{"type": "text", "text": text}], "isError": bool(is_error)}


def _get_base_url() -> str:
    base = os.environ.get("STOCKCHART_BASE_URL", "http://localhost:5253").strip()
    return base.rstrip("/")


def _get_timeout() -> float:
    raw = os.environ.get("STOCKCHART_TIMEOUT_SEC", "30").strip()
    try:
        v = float(raw)
        return v if v > 0 else 30.0
    except Exception:
        return 30.0


def _http_json(
    method: str,
    path: str,
    *,
    query: Optional[Dict[str, Any]] = None,
    body: Optional[Any] = None,
) -> Tuple[int, Any]:
    base = _get_base_url()
    url = base + path

    if query:
        # Drop None values so we don't send "param=None".
        q = {k: v for k, v in query.items() if v is not None}
        qs = urllib.parse.urlencode(q, doseq=True)
        url = url + ("?" + qs if qs else "")

    data_bytes: Optional[bytes] = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data_bytes = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method.upper())

    ctx = None
    if url.lower().startswith("https://") and os.environ.get("STOCKCHART_INSECURE_TLS", "").strip() in ("1", "true", "TRUE"):
        import ssl  # local import to keep startup light

        ctx = ssl._create_unverified_context()

    try:
        with urllib.request.urlopen(req, timeout=_get_timeout(), context=ctx) as resp:
            status = int(getattr(resp, "status", 200))
            raw = resp.read()
            if not raw:
                return status, None
            return status, json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            payload = json.loads(raw.decode("utf-8")) if raw else None
        except Exception:
            payload = raw.decode("utf-8", errors="replace") if raw else None
        return int(e.code), payload
    except Exception as e:
        message = str(e)
        details: Dict[str, Any] = {
            "exceptionType": type(e).__name__,
            "url": url,
            "baseUrl": base,
        }

        lowered = message.lower()
        hint: Optional[str] = None
        if "wrong_version_number" in lowered or "wrong version number" in lowered:
            hint = (
                "TLS handshake failed; this usually means you're calling https:// against an HTTP endpoint/port. "
                "Check STOCKCHART_BASE_URL scheme/port (for this repo: http://localhost:5253)."
            )
        elif "certificate_verify_failed" in lowered:
            hint = (
                "TLS certificate verification failed. If this is a local/dev self-signed cert, set "
                "STOCKCHART_INSECURE_TLS=1 (dev only), or install a trusted certificate."
            )
        elif "timed out" in lowered:
            hint = "Request timed out; check that the StockChart REST API is running and reachable."
        elif "connection refused" in lowered:
            hint = "Connection refused; check STOCKCHART_BASE_URL and that the REST API is listening on that host/port."

        if hint:
            details["hint"] = hint

        return 0, {"error": {"code": "INTERNAL_ERROR", "message": message, "details": details}}


def _tool_defs() -> List[Dict[str, Any]]:
    # Keep schemas strict but small. Client can discover detailed REST contracts from mcp.md.
    return [
        {
            "name": "list_markets",
            "description": "List available markets (dictionary).",
            "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        },
        {
            "name": "search_stocks",
            "description": "Search and list stocks/tickers with pagination.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "q": {"type": "string"},
                    "marketCode": {"type": "string"},
                    "sectorKey": {"type": "string"},
                    "industryKey": {"type": "string"},
                    "isActive": {"type": "boolean"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 200, "default": 50},
                    "offset": {"type": "integer", "minimum": 0, "default": 0},
                },
                "additionalProperties": False,
            },
        },
        {
            "name": "list_sectors",
            "description": "List sectors (dictionary).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "marketCode": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 1000, "default": 200},
                    "offset": {"type": "integer", "minimum": 0, "default": 0},
                },
                "additionalProperties": False,
            },
        },
        {
            "name": "list_industries",
            "description": "List industries (dictionary).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "marketCode": {"type": "string"},
                    "sectorKey": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 1000, "default": 200},
                    "offset": {"type": "integer", "minimum": 0, "default": 0},
                },
                "additionalProperties": False,
            },
        },
        {
            "name": "list_metrics",
            "description": "List/search metrics catalog (fundamentals).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "q": {"type": "string"},
                    "valueType": {"type": "string"},
                    "unit": {"type": "string"},
                    "statementType": {"type": "string"},
                    "periodSupport": {"type": "string", "enum": ["annual", "quarter", "ltm"]},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 500, "default": 100},
                    "offset": {"type": "integer", "minimum": 0, "default": 0},
                },
                "additionalProperties": False,
            },
        },
        {
            "name": "statements_available",
            "description": "Get statements availability/coverage for a ticker.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "marketCode": {"type": "string"},
                    "ticker": {"type": "string"},
                },
                "required": ["marketCode", "ticker"],
                "additionalProperties": False,
            },
        },
        {
            "name": "statement_series",
            "description": "Get a fundamental metric time series for a ticker + metricKey.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "marketCode": {"type": "string"},
                    "ticker": {"type": "string"},
                    "metricKey": {"type": "string"},
                    "period": {"type": "string", "enum": ["annual", "quarter", "ltm"], "default": "annual"},
                    "standard": {"type": "string"},
                    "mode": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 200, "default": 50},
                },
                "required": ["marketCode", "ticker", "metricKey"],
                "additionalProperties": False,
            },
        },
        {
            "name": "statement_series_batch",
            "description": "Fetch multiple metric series in one call (max 50).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "maxItems": 50,
                        "items": {
                            "type": "object",
                            "properties": {
                                "marketCode": {"type": "string"},
                                "ticker": {"type": "string"},
                                "metricKey": {"type": "string"},
                                "period": {"type": "string", "enum": ["annual", "quarter", "ltm"]},
                                "standard": {"type": "string"},
                                "mode": {"type": "string"},
                                "limit": {"type": "integer", "minimum": 1, "maximum": 200},
                            },
                            "required": ["marketCode", "ticker", "metricKey"],
                            "additionalProperties": False,
                        },
                    }
                },
                "required": ["items"],
                "additionalProperties": False,
            },
        },
        {
            "name": "candles_series",
            "description": "Get candle history (time series) with selectable fields to keep the response small.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "period": {"type": "number", "minimum": 0},
                    "startDate": {"type": "string", "description": "Optional ISO datetime (server timezone)."},
                    "endDate": {"type": "string", "description": "Optional ISO datetime (server timezone)."},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 5000, "default": 500},
                    "fields": {
                        "type": "string",
                        "description": "Comma-separated field tokens, e.g. 't,c' (default), 'ohlc,vol,oi', 'bidask'.",
                    },
                },
                "required": ["ticker", "period"],
                "additionalProperties": False,
            },
        },
        {
            "name": "dividends",
            "description": "Get dividends history for a ticker (MOEX).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                },
                "required": ["ticker"],
                "additionalProperties": False,
            },
        },
    ]


def _call_tool(name: str, args: Dict[str, Any]) -> Tuple[bool, Any]:
    # Returns (is_error, payload)
    if name == "list_markets":
        status, payload = _http_json("GET", "/api/dictionary/markets")
        return status >= 400 or status == 0, payload

    if name == "search_stocks":
        q = {
            "q": args.get("q"),
            "marketCode": args.get("marketCode"),
            "sectorKey": args.get("sectorKey"),
            "industryKey": args.get("industryKey"),
            "isActive": args.get("isActive"),
            "limit": args.get("limit", 50),
            "offset": args.get("offset", 0),
        }
        status, payload = _http_json("GET", "/api/dictionary/stocks", query=q)
        return status >= 400 or status == 0, payload

    if name == "list_sectors":
        q = {
            "marketCode": args.get("marketCode"),
            "limit": args.get("limit", 200),
            "offset": args.get("offset", 0),
        }
        status, payload = _http_json("GET", "/api/dictionary/sectors", query=q)
        return status >= 400 or status == 0, payload

    if name == "list_industries":
        q = {
            "marketCode": args.get("marketCode"),
            "sectorKey": args.get("sectorKey"),
            "limit": args.get("limit", 200),
            "offset": args.get("offset", 0),
        }
        status, payload = _http_json("GET", "/api/dictionary/industries", query=q)
        return status >= 400 or status == 0, payload

    if name == "list_metrics":
        q = {
            "q": args.get("q"),
            "valueType": args.get("valueType"),
            "unit": args.get("unit"),
            "statementType": args.get("statementType"),
            "periodSupport": args.get("periodSupport"),
            "limit": args.get("limit", 100),
            "offset": args.get("offset", 0),
        }
        status, payload = _http_json("GET", "/api/dictionary/metrics", query=q)
        return status >= 400 or status == 0, payload

    if name == "statements_available":
        market_code = str(args.get("marketCode", "")).strip()
        ticker = str(args.get("ticker", "")).strip()
        status, payload = _http_json("GET", f"/api/statements/{urllib.parse.quote(market_code)}/{urllib.parse.quote(ticker)}/available")
        return status >= 400 or status == 0, payload

    if name == "statement_series":
        market_code = str(args.get("marketCode", "")).strip()
        ticker = str(args.get("ticker", "")).strip()
        metric_key = str(args.get("metricKey", "")).strip()
        q = {
            "period": args.get("period", "annual"),
            "standard": args.get("standard"),
            "mode": args.get("mode"),
            "limit": args.get("limit", 50),
        }
        status, payload = _http_json(
            "GET",
            f"/api/statements/{urllib.parse.quote(market_code)}/{urllib.parse.quote(ticker)}/series/{urllib.parse.quote(metric_key)}",
            query=q,
        )
        return status >= 400 or status == 0, payload

    if name == "statement_series_batch":
        items = args.get("items")
        if not isinstance(items, list):
            return True, {"error": {"code": "VALIDATION_ERROR", "message": "items must be an array", "details": {}}}
        status, payload = _http_json("POST", "/api/statements/series/batch", body={"items": items})
        return status >= 400 or status == 0, payload

    if name == "candles_series":
        ticker = str(args.get("ticker", "")).strip()
        period = args.get("period")
        if not ticker:
            return True, {"error": {"code": "VALIDATION_ERROR", "message": "ticker is required", "details": {}}}
        if period is None:
            return True, {"error": {"code": "VALIDATION_ERROR", "message": "period is required", "details": {}}}
        q = {
            "ticker": ticker,
            "period": period,
            "startDate": args.get("startDate"),
            "endDate": args.get("endDate"),
            "limit": args.get("limit", 500),
            "fields": args.get("fields"),
        }
        status, payload = _http_json("GET", "/api/clusters/candlesSeries", query=q)
        return status >= 400 or status == 0, payload

    if name == "dividends":
        ticker = str(args.get("ticker", "")).strip()
        if not ticker:
            return True, {"error": {"code": "VALIDATION_ERROR", "message": "ticker is required", "details": {}}}
        status, payload = _http_json("GET", f"/api/Dividends/{urllib.parse.quote(ticker)}")
        return status >= 400 or status == 0, payload

    return True, {"error": {"code": "VALIDATION_ERROR", "message": f"Unknown tool: {name}", "details": {}}}


def _handle_request(msg: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    req_id = msg.get("id")
    method = msg.get("method")
    params = msg.get("params") or {}

    if method == "initialize":
        requested = (params.get("protocolVersion") or "").strip()
        if requested and requested not in PROTOCOL_VERSIONS_SUPPORTED:
            # Be tolerant: some MCP hosts may send a newer protocol version string.
            # We can still interop using the latest version we support.
            _eprint(
                f"[StockChart.MCP] warn: unsupported protocolVersion={requested}; "
                f"falling back to {PROTOCOL_VERSIONS_SUPPORTED[0]}"
            )
            requested = ""

        version = requested if requested else PROTOCOL_VERSIONS_SUPPORTED[0]
        return _jsonrpc_result(
            req_id,
            {
                "protocolVersion": version,
                "capabilities": {"tools": {"listChanged": False}, "logging": {}},
                "serverInfo": {"name": "StockChart.MCP", "version": "0.1.0"},
                "instructions": "Expose StockChart economic/fundamental dictionaries + series via tools/*.",
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(req_id, {"tools": _tool_defs(), "nextCursor": None})

    if method == "tools/call":
        name = params.get("name")
        arguments = params.get("arguments") or {}
        if not isinstance(name, str) or not name:
            return _jsonrpc_error(req_id, -32602, "Invalid tool name")
        if not isinstance(arguments, dict):
            return _jsonrpc_error(req_id, -32602, "Tool arguments must be an object")

        is_err, payload = _call_tool(name, arguments)
        return _jsonrpc_result(req_id, _tool_result_json(payload, is_error=is_err))

    if method == "notifications/initialized":
        # No response for notifications.
        return None

    # Unknown method.
    return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")


def main() -> int:
    _ensure_utf8_stdio()
    _eprint(f"[StockChart.MCP] starting; baseUrl={_get_base_url()}")

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            msg = json.loads(line)
        except Exception as e:
            _eprint("[StockChart.MCP] invalid JSON:", e)
            continue

        # Support JSON-RPC batches in a minimal way.
        if isinstance(msg, list):
            responses: List[Dict[str, Any]] = []
            for item in msg:
                if not isinstance(item, dict):
                    continue
                resp = _handle_request(item)
                if resp is not None:
                    responses.append(resp)
            if responses:
                _send(responses)  # batch response
            continue

        if not isinstance(msg, dict):
            continue

        resp = _handle_request(msg)
        if resp is not None:
            _send(resp)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
