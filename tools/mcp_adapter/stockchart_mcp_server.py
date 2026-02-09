#!/usr/bin/env python3
# Minimal MCP (Model Context Protocol) stdio server exposing StockChart economic/fundamental tools (see mcp.md).
#
# Transport: newline-delimited JSON-RPC (per MCP transports spec).
# This server implements: initialize, tools/list, tools/call, resources/list,
# resources/templates/list, resources/read.
#
# Configuration:
#   STOCKCHART_BASE_URL (default: http://localhost:5000)
#   STOCKCHART_TIMEOUT_SEC (default: 30)
#   STOCKCHART_INSECURE_TLS=1  (disable TLS verification for https localhost dev)

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
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


def _validation_error(message: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {"error": {"code": "VALIDATION_ERROR", "message": message, "details": details or {}}}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _split_csv(value: Optional[str]) -> List[str]:
    if value is None:
        return []
    return [part.strip() for part in value.split(",") if part and part.strip()]


def _dedupe_keep_order(items: List[str]) -> List[str]:
    seen: set[str] = set()
    out: List[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


CANDLES_PROFILE_TO_FIELDS: Dict[str, str] = {
    "close": "t,c",
    "ohlc": "t,o,h,l,c",
    "ohlcv": "t,o,h,l,c,v",
}


def _get_default_candles_profile() -> str:
    raw = os.environ.get("STOCKCHART_DEFAULT_CANDLES_PROFILE", "close").strip().lower()
    return raw if raw in CANDLES_PROFILE_TO_FIELDS else "close"


def _get_default_list_profile() -> str:
    raw = os.environ.get("STOCKCHART_DEFAULT_LIST_PROFILE", "full").strip().lower()
    return raw if raw in ("brief", "base", "full") else "full"


LIST_PROJECTION_CONFIG: Dict[str, Dict[str, Any]] = {
    "list_markets": {
        "dataKey": None,
        "allowedFields": ["marketCode", "marketName", "currency", "timezone", "source"],
        "profiles": {
            "brief": ["marketCode", "marketName"],
            "base": ["marketCode", "marketName", "currency"],
            "full": ["marketCode", "marketName", "currency", "timezone", "source"],
        },
    },
    "search_stocks": {
        "dataKey": "data",
        "allowedFields": [
            "ticker",
            "name",
            "marketCode",
            "sectorKey",
            "sectorName",
            "industryKey",
            "industryName",
            "isin",
            "currency",
            "isActive",
            "periodSupport",
            "source",
        ],
        "profiles": {
            "brief": ["ticker", "name", "marketCode"],
            "base": ["ticker", "name", "marketCode", "sectorKey", "industryKey"],
            "full": [
                "ticker",
                "name",
                "marketCode",
                "sectorKey",
                "sectorName",
                "industryKey",
                "industryName",
                "isin",
                "currency",
                "isActive",
                "periodSupport",
                "source",
            ],
        },
    },
    "list_sectors": {
        "dataKey": "data",
        "allowedFields": ["sectorKey", "sectorName", "marketCode", "description"],
        "profiles": {
            "brief": ["sectorKey", "sectorName"],
            "base": ["sectorKey", "sectorName", "marketCode"],
            "full": ["sectorKey", "sectorName", "marketCode", "description"],
        },
    },
    "list_industries": {
        "dataKey": "data",
        "allowedFields": ["industryKey", "industryName", "sectorKey", "marketCode", "description"],
        "profiles": {
            "brief": ["industryKey", "industryName"],
            "base": ["industryKey", "industryName", "sectorKey", "marketCode"],
            "full": ["industryKey", "industryName", "sectorKey", "marketCode", "description"],
        },
    },
    "list_metrics": {
        "dataKey": "data",
        "allowedFields": [
            "metricKey",
            "displayName",
            "description",
            "valueType",
            "unit",
            "statementType",
            "periodSupport",
            "source",
        ],
        "profiles": {
            "brief": ["metricKey", "displayName"],
            "base": ["metricKey", "displayName", "valueType", "unit", "statementType"],
            "full": [
                "metricKey",
                "displayName",
                "description",
                "valueType",
                "unit",
                "statementType",
                "periodSupport",
                "source",
            ],
        },
    },
}

MARKOWITZ_ALLOWED_FIELDS: List[str] = ["success", "actual", "stddev", "chart"]
MARKOWITZ_PROFILES: Dict[str, List[str]] = {
    "brief": ["success", "actual", "stddev"],
    "full": ["success", "actual", "stddev", "chart"],
}
MARKOWITZ_ALLOWED_MODES: List[str] = ["min_variance", "max_return", "max_sharpe"]


def _resolve_list_fields(tool_name: str, args: Dict[str, Any]) -> Tuple[bool, Any]:
    cfg = LIST_PROJECTION_CONFIG.get(tool_name)
    if cfg is None:
        return True, _validation_error("Internal projection config error", {"tool": tool_name})

    allowed: List[str] = cfg["allowedFields"]
    profiles: Dict[str, List[str]] = cfg["profiles"]

    raw_fields = args.get("fields")
    if raw_fields is not None:
        if not isinstance(raw_fields, str):
            return True, _validation_error("fields must be a comma-separated string", {"tool": tool_name})
        selected = _dedupe_keep_order(_split_csv(raw_fields))
        if not selected:
            return True, _validation_error("fields must not be empty", {"tool": tool_name, "allowed": allowed})
        unsupported = [name for name in selected if name not in allowed]
        if unsupported:
            return True, _validation_error(
                "Unknown fields requested",
                {"tool": tool_name, "unknown": unsupported, "allowed": allowed},
            )
        return False, selected

    raw_profile = args.get("profile")
    if raw_profile is None:
        profile = _get_default_list_profile()
    else:
        if not isinstance(raw_profile, str):
            return True, _validation_error("profile must be a string", {"tool": tool_name, "allowed": list(profiles.keys())})
        profile = raw_profile.strip().lower()

    if profile not in profiles:
        return True, _validation_error(
            "Unknown profile",
            {"tool": tool_name, "profile": profile, "allowed": list(profiles.keys())},
        )

    return False, profiles[profile]


def _project_row(row: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    return {field: row.get(field) for field in fields}


def _apply_list_projection(tool_name: str, payload: Any, args: Dict[str, Any]) -> Tuple[bool, Any]:
    bad_fields, fields_or_error = _resolve_list_fields(tool_name, args)
    if bad_fields:
        return True, fields_or_error
    fields: List[str] = fields_or_error

    cfg = LIST_PROJECTION_CONFIG[tool_name]
    data_key = cfg["dataKey"]

    if data_key is None:
        if isinstance(payload, list):
            return False, [_project_row(item, fields) if isinstance(item, dict) else item for item in payload]
        return False, payload

    if not isinstance(payload, dict):
        return False, payload

    data = payload.get(data_key)
    if not isinstance(data, list):
        return False, payload

    out = dict(payload)
    out[data_key] = [_project_row(item, fields) if isinstance(item, dict) else item for item in data]
    return False, out


def _resolve_markowitz_fields(args: Dict[str, Any]) -> Tuple[bool, Any]:
    raw_fields = args.get("fields")
    if raw_fields is not None:
        if not isinstance(raw_fields, str):
            return True, _validation_error("fields must be a comma-separated string", {"tool": "portfolio_markowitz"})
        selected = _dedupe_keep_order(_split_csv(raw_fields))
        if not selected:
            return True, _validation_error("fields must not be empty", {"tool": "portfolio_markowitz", "allowed": MARKOWITZ_ALLOWED_FIELDS})
        unsupported = [name for name in selected if name not in MARKOWITZ_ALLOWED_FIELDS]
        if unsupported:
            return True, _validation_error(
                "Unknown fields requested",
                {"tool": "portfolio_markowitz", "unknown": unsupported, "allowed": MARKOWITZ_ALLOWED_FIELDS},
            )
        return False, selected

    raw_profile = args.get("profile")
    if raw_profile is None:
        return False, MARKOWITZ_PROFILES["full"]
    if not isinstance(raw_profile, str):
        return True, _validation_error("profile must be a string", {"tool": "portfolio_markowitz", "allowed": list(MARKOWITZ_PROFILES.keys())})

    profile = raw_profile.strip().lower()
    fields = MARKOWITZ_PROFILES.get(profile)
    if fields is None:
        return True, _validation_error(
            "Unknown profile",
            {"tool": "portfolio_markowitz", "profile": profile, "allowed": list(MARKOWITZ_PROFILES.keys())},
        )
    return False, fields


def _resolve_candles_fields(fields_value: Any, profile_value: Any) -> Tuple[bool, Any]:
    if fields_value is not None:
        if not isinstance(fields_value, str):
            return True, _validation_error("fields must be a comma-separated string")
        fields = fields_value.strip()
        if not fields:
            return True, _validation_error("fields must not be empty")
        return False, fields

    if profile_value is None:
        profile = _get_default_candles_profile()
    else:
        if not isinstance(profile_value, str):
            return True, _validation_error("profile must be a string", {"allowed": list(CANDLES_PROFILE_TO_FIELDS.keys())})
        profile = profile_value.strip().lower()

    mapped = CANDLES_PROFILE_TO_FIELDS.get(profile)
    if mapped is None:
        return True, _validation_error("Unknown candles profile", {"profile": profile, "allowed": list(CANDLES_PROFILE_TO_FIELDS.keys())})
    return False, mapped


def _normalize_tickers(raw: Any, *, max_items: int = 50) -> Tuple[bool, Any]:
    if not isinstance(raw, list):
        return True, _validation_error("tickers must be an array")
    if not raw:
        return True, _validation_error("tickers must not be empty")
    if len(raw) > max_items:
        return True, _validation_error("tickers max is 50", {"max": max_items, "actual": len(raw)})

    normalized: List[str] = []
    seen: set[str] = set()
    for idx, item in enumerate(raw):
        if not isinstance(item, str):
            return True, _validation_error("ticker must be a string", {"index": idx})
        ticker = item.strip()
        if not ticker:
            return True, _validation_error("ticker must not be empty", {"index": idx})
        key = ticker.upper()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(ticker)

    if not normalized:
        return True, _validation_error("tickers must not be empty")
    return False, normalized


def _parse_positive_number(value: Any, field: str) -> Tuple[bool, Any]:
    if value is None:
        return True, _validation_error(f"{field} is required")
    try:
        num = float(value)
    except Exception:
        return True, _validation_error(f"{field} must be a number", {"field": field, "value": value})
    if num <= 0:
        return True, _validation_error(f"{field} must be > 0", {"field": field, "value": num})
    return False, num


def _parse_limit(value: Any, *, default_value: int, minimum: int, maximum: int, field: str = "limit") -> Tuple[bool, Any]:
    if value is None:
        return False, default_value
    try:
        limit = int(value)
    except Exception:
        return True, _validation_error(f"{field} must be an integer", {"field": field, "value": value})
    if limit < minimum or limit > maximum:
        return True, _validation_error(f"{field} must be between {minimum} and {maximum}", {"field": field, "value": limit})
    return False, limit


def _parse_continue_on_error(value: Any) -> Tuple[bool, Any]:
    if value is None:
        return False, True
    if not isinstance(value, bool):
        return True, _validation_error("continueOnError must be boolean")
    return False, value


def _tool_defs() -> List[Dict[str, Any]]:
    # Keep schemas strict but small. Client can discover detailed REST contracts from mcp.md.
    return [
        {
            "name": "list_markets",
            "description": "List available markets (dictionary).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "profile": {"type": "string", "enum": ["brief", "base", "full"]},
                    "fields": {"type": "string", "description": "Comma-separated output fields override profile."},
                },
                "additionalProperties": False,
            },
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
                    "profile": {"type": "string", "enum": ["brief", "base", "full"]},
                    "fields": {"type": "string", "description": "Comma-separated output fields override profile."},
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
                    "profile": {"type": "string", "enum": ["brief", "base", "full"]},
                    "fields": {"type": "string", "description": "Comma-separated output fields override profile."},
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
                    "profile": {"type": "string", "enum": ["brief", "base", "full"]},
                    "fields": {"type": "string", "description": "Comma-separated output fields override profile."},
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
                    "profile": {"type": "string", "enum": ["brief", "base", "full"]},
                    "fields": {"type": "string", "description": "Comma-separated output fields override profile."},
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
            "name": "candles_series_batch",
            "description": "Get candle history for multiple tickers in one MCP call (single-ticker candles_series remains unchanged).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "tickers": {"type": "array", "minItems": 1, "maxItems": 50, "items": {"type": "string"}},
                    "period": {"type": "number", "minimum": 0},
                    "startDate": {"type": "string", "description": "Optional ISO datetime (server timezone)."},
                    "endDate": {"type": "string", "description": "Optional ISO datetime (server timezone)."},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 5000, "default": 500},
                    "profile": {"type": "string", "enum": ["close", "ohlc", "ohlcv"]},
                    "fields": {
                        "type": "string",
                        "description": "Comma-separated field tokens. Has priority over profile.",
                    },
                    "continueOnError": {"type": "boolean", "default": True},
                },
                "required": ["tickers", "period"],
                "additionalProperties": False,
            },
        },
        {
            "name": "portfolio_markowitz",
            "description": "Read-only Markowitz optimization for a ticker list (no portfolio writes, supports modes and constraints).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "tickers": {"type": "array", "minItems": 1, "maxItems": 50, "items": {"type": "string"}},
                    "startDate": {"type": "string", "description": "ISO datetime (server timezone)."},
                    "endDate": {"type": "string", "description": "ISO datetime (server timezone)."},
                    "risk": {"type": "number", "minimum": 0},
                    "mode": {"type": "string", "enum": MARKOWITZ_ALLOWED_MODES, "description": "min_variance|max_return|max_sharpe"},
                    "riskFreeRate": {"type": "number", "description": "Used in max_sharpe mode."},
                    "minWeight": {"type": "number", "minimum": 0, "maximum": 1},
                    "maxWeight": {"type": "number", "minimum": 0, "maximum": 1},
                    "sectorMaxWeights": {"type": "string", "description": "CSV 'sectorKey:weight', e.g. '1:0.4,2:0.3'."},
                    "topN": {"type": "integer", "minimum": 1, "maximum": 50},
                    "profile": {"type": "string", "enum": ["brief", "full"]},
                    "fields": {"type": "string", "description": "Comma-separated top-level fields override profile."},
                },
                "required": ["tickers", "startDate", "endDate", "risk"],
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


def _resource_defs() -> List[Dict[str, Any]]:
    return [
        {
            "uri": "stockchart://meta/markets",
            "name": "Markets dictionary",
            "description": "All available markets.",
            "mimeType": "application/json",
        },
        {
            "uri": "stockchart://meta/sectors",
            "name": "Sectors dictionary",
            "description": "Sectors dictionary (all markets, paged server-side).",
            "mimeType": "application/json",
        },
        {
            "uri": "stockchart://meta/industries",
            "name": "Industries dictionary",
            "description": "Industries dictionary (all markets, paged server-side).",
            "mimeType": "application/json",
        },
        {
            "uri": "stockchart://meta/metrics",
            "name": "Metrics dictionary",
            "description": "Fundamental metrics catalog.",
            "mimeType": "application/json",
        },
        {
            "uri": "stockchart://docs/tooling",
            "name": "Tooling overview",
            "description": "Human-readable summary of available tools/resources.",
            "mimeType": "text/markdown",
        },
    ]


def _resource_template_defs() -> List[Dict[str, Any]]:
    return [
        {
            "uriTemplate": "stockchart://candles/{ticker}/{period}",
            "name": "Candles series",
            "description": "OHLC candle series. Optional query: startDate,endDate,limit,fields.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stockchart://dividends/{ticker}",
            "name": "Dividends history",
            "description": "Dividend history for a ticker (MOEX).",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stockchart://statements/available/{marketCode}/{ticker}",
            "name": "Statements availability",
            "description": "Available fundamentals coverage for ticker+market.",
            "mimeType": "application/json",
        },
        {
            "uriTemplate": "stockchart://statements/series/{marketCode}/{ticker}/{metricKey}",
            "name": "Statement metric series",
            "description": "Fundamental metric time series; optional query: period,standard,mode,limit.",
            "mimeType": "application/json",
        },
    ]


def _resource_error(code: int, message: str, data: Any = None) -> Dict[str, Any]:
    err: Dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        err["data"] = data
    return err


def _resource_json_result(uri: str, data: Any) -> Dict[str, Any]:
    return {
        "contents": [
            {
                "uri": uri,
                "mimeType": "application/json",
                "text": json.dumps(data, ensure_ascii=False, indent=2),
            }
        ]
    }


def _resource_text_result(uri: str, text: str, mime_type: str = "text/plain") -> Dict[str, Any]:
    return {"contents": [{"uri": uri, "mimeType": mime_type, "text": text}]}


def _resource_http_result(uri: str, status: int, payload: Any) -> Tuple[bool, Any]:
    if status >= 400 or status == 0:
        message = "Failed to read resource from StockChart REST API"
        if isinstance(payload, dict):
            err = payload.get("error")
            if isinstance(err, dict):
                msg = err.get("message")
                if isinstance(msg, str) and msg.strip():
                    message = msg.strip()
        return True, _resource_error(
            -32000,
            message,
            {
                "uri": uri,
                "status": status,
                "payload": payload,
            },
        )
    return False, _resource_json_result(uri, payload)


def _query_value(query: Dict[str, List[str]], key: str) -> Optional[str]:
    values = query.get(key)
    if not values:
        return None
    return values[0]


def _validate_query_keys(query: Dict[str, List[str]], allowed: List[str]) -> Optional[Dict[str, Any]]:
    unsupported = [k for k in query.keys() if k not in allowed]
    if unsupported:
        return _resource_error(
            -32602,
            "Unsupported query parameter(s)",
            {
                "unsupported": unsupported,
                "allowed": allowed,
            },
        )
    return None


def _parse_int_field(raw: str, field: str, *, minimum: Optional[int] = None, maximum: Optional[int] = None) -> Tuple[bool, Any]:
    try:
        value = int(raw)
    except Exception:
        return True, _resource_error(-32602, f"{field} must be an integer", {"field": field, "value": raw})

    if minimum is not None and value < minimum:
        return True, _resource_error(-32602, f"{field} must be >= {minimum}", {"field": field, "value": value})
    if maximum is not None and value > maximum:
        return True, _resource_error(-32602, f"{field} must be <= {maximum}", {"field": field, "value": value})
    return False, value


def _parse_period_field(raw: str) -> Tuple[bool, Any]:
    if raw == "":
        return True, _resource_error(-32602, "period is required")
    try:
        if "." in raw or "e" in raw or "E" in raw:
            value: Any = float(raw)
        else:
            value = int(raw)
    except Exception:
        return True, _resource_error(-32602, "period must be a number", {"value": raw})

    if value < 0:
        return True, _resource_error(-32602, "period must be >= 0", {"value": value})
    return False, value


def _docs_tooling_markdown() -> str:
    lines = [
        "# StockChart MCP resources",
        "",
        "## Static resources",
    ]
    for item in _resource_defs():
        lines.append(f"- `{item['uri']}`")

    lines.extend(["", "## Resource templates"])
    for item in _resource_template_defs():
        lines.append(f"- `{item['uriTemplate']}`")

    lines.extend(["", "## Tools"])
    for item in _tool_defs():
        lines.append(f"- `{item['name']}`")

    return "\n".join(lines)


def _read_resource(uri: str) -> Tuple[bool, Any]:
    parsed = urllib.parse.urlparse(uri)
    if parsed.scheme.lower() != "stockchart":
        return True, _resource_error(
            -32602,
            "Unsupported URI scheme",
            {"uri": uri, "expectedScheme": "stockchart"},
        )

    host = (parsed.netloc or "").strip().lower()
    segments = [urllib.parse.unquote(seg).strip() for seg in parsed.path.split("/") if seg]
    query = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)

    if host == "meta" and segments == ["markets"]:
        status, payload = _http_json("GET", "/api/dictionary/markets")
        return _resource_http_result(uri, status, payload)

    if host == "meta" and segments == ["sectors"]:
        status, payload = _http_json("GET", "/api/dictionary/sectors", query={"limit": 1000, "offset": 0})
        return _resource_http_result(uri, status, payload)

    if host == "meta" and segments == ["industries"]:
        status, payload = _http_json("GET", "/api/dictionary/industries", query={"limit": 1000, "offset": 0})
        return _resource_http_result(uri, status, payload)

    if host == "meta" and segments == ["metrics"]:
        status, payload = _http_json("GET", "/api/dictionary/metrics", query={"limit": 500, "offset": 0})
        return _resource_http_result(uri, status, payload)

    if host == "docs" and segments == ["tooling"]:
        return False, _resource_text_result(uri, _docs_tooling_markdown(), mime_type="text/markdown")

    if host == "candles":
        if len(segments) != 2:
            return True, _resource_error(-32602, "Expected URI: stockchart://candles/{ticker}/{period}", {"uri": uri})
        query_error = _validate_query_keys(query, ["startDate", "endDate", "limit", "fields"])
        if query_error:
            return True, query_error

        ticker = segments[0]
        if not ticker:
            return True, _resource_error(-32602, "ticker is required", {"uri": uri})

        bad_period, period_or_error = _parse_period_field(segments[1])
        if bad_period:
            return True, period_or_error
        period = period_or_error

        limit = 500
        raw_limit = _query_value(query, "limit")
        if raw_limit is not None:
            bad_limit, limit_or_error = _parse_int_field(raw_limit, "limit", minimum=1, maximum=5000)
            if bad_limit:
                return True, limit_or_error
            limit = limit_or_error

        status, payload = _http_json(
            "GET",
            "/api/clusters/candlesSeries",
            query={
                "ticker": ticker,
                "period": period,
                "startDate": _query_value(query, "startDate"),
                "endDate": _query_value(query, "endDate"),
                "limit": limit,
                "fields": _query_value(query, "fields"),
            },
        )
        return _resource_http_result(uri, status, payload)

    if host == "dividends":
        if len(segments) != 1:
            return True, _resource_error(-32602, "Expected URI: stockchart://dividends/{ticker}", {"uri": uri})
        query_error = _validate_query_keys(query, [])
        if query_error:
            return True, query_error

        ticker = segments[0]
        if not ticker:
            return True, _resource_error(-32602, "ticker is required", {"uri": uri})
        status, payload = _http_json("GET", f"/api/Dividends/{urllib.parse.quote(ticker)}")
        return _resource_http_result(uri, status, payload)

    if host == "statements":
        if not segments:
            return True, _resource_error(-32602, "Expected URI under stockchart://statements/*", {"uri": uri})

        if segments[0] == "available":
            if len(segments) != 3:
                return True, _resource_error(
                    -32602,
                    "Expected URI: stockchart://statements/available/{marketCode}/{ticker}",
                    {"uri": uri},
                )
            query_error = _validate_query_keys(query, [])
            if query_error:
                return True, query_error

            market_code = segments[1]
            ticker = segments[2]
            if not market_code or not ticker:
                return True, _resource_error(-32602, "marketCode and ticker are required", {"uri": uri})
            status, payload = _http_json(
                "GET",
                f"/api/statements/{urllib.parse.quote(market_code)}/{urllib.parse.quote(ticker)}/available",
            )
            return _resource_http_result(uri, status, payload)

        if segments[0] == "series":
            if len(segments) != 4:
                return True, _resource_error(
                    -32602,
                    "Expected URI: stockchart://statements/series/{marketCode}/{ticker}/{metricKey}",
                    {"uri": uri},
                )
            query_error = _validate_query_keys(query, ["period", "standard", "mode", "limit"])
            if query_error:
                return True, query_error

            market_code = segments[1]
            ticker = segments[2]
            metric_key = segments[3]
            if not market_code or not ticker or not metric_key:
                return True, _resource_error(-32602, "marketCode, ticker and metricKey are required", {"uri": uri})

            limit = 50
            raw_limit = _query_value(query, "limit")
            if raw_limit is not None:
                bad_limit, limit_or_error = _parse_int_field(raw_limit, "limit", minimum=1, maximum=200)
                if bad_limit:
                    return True, limit_or_error
                limit = limit_or_error

            status, payload = _http_json(
                "GET",
                f"/api/statements/{urllib.parse.quote(market_code)}/{urllib.parse.quote(ticker)}/series/{urllib.parse.quote(metric_key)}",
                query={
                    "period": _query_value(query, "period") or "annual",
                    "standard": _query_value(query, "standard"),
                    "mode": _query_value(query, "mode"),
                    "limit": limit,
                },
            )
            return _resource_http_result(uri, status, payload)

        return True, _resource_error(-32602, "Unsupported statements URI path", {"uri": uri})

    return True, _resource_error(-32602, "Unknown resource URI", {"uri": uri})


def _extract_error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        err = payload.get("error")
        if isinstance(err, dict):
            msg = err.get("message")
            if isinstance(msg, str) and msg.strip():
                return msg.strip()
    return fallback


def _call_tool(name: str, args: Dict[str, Any]) -> Tuple[bool, Any]:
    # Returns (is_error, payload)
    if name == "list_markets":
        status, payload = _http_json("GET", "/api/dictionary/markets")
        if status >= 400 or status == 0:
            return True, payload
        return _apply_list_projection("list_markets", payload, args)

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
        if status >= 400 or status == 0:
            return True, payload
        return _apply_list_projection("search_stocks", payload, args)

    if name == "list_sectors":
        q = {
            "marketCode": args.get("marketCode"),
            "limit": args.get("limit", 200),
            "offset": args.get("offset", 0),
        }
        status, payload = _http_json("GET", "/api/dictionary/sectors", query=q)
        if status >= 400 or status == 0:
            return True, payload
        return _apply_list_projection("list_sectors", payload, args)

    if name == "list_industries":
        q = {
            "marketCode": args.get("marketCode"),
            "sectorKey": args.get("sectorKey"),
            "limit": args.get("limit", 200),
            "offset": args.get("offset", 0),
        }
        status, payload = _http_json("GET", "/api/dictionary/industries", query=q)
        if status >= 400 or status == 0:
            return True, payload
        return _apply_list_projection("list_industries", payload, args)

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
        if status >= 400 or status == 0:
            return True, payload
        return _apply_list_projection("list_metrics", payload, args)

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

    if name == "candles_series_batch":
        bad_tickers, tickers_or_error = _normalize_tickers(args.get("tickers"), max_items=50)
        if bad_tickers:
            return True, tickers_or_error
        tickers: List[str] = tickers_or_error

        bad_period, period_or_error = _parse_positive_number(args.get("period"), "period")
        if bad_period:
            return True, period_or_error
        period = period_or_error

        bad_limit, limit_or_error = _parse_limit(args.get("limit"), default_value=500, minimum=1, maximum=5000)
        if bad_limit:
            return True, limit_or_error
        limit = limit_or_error

        bad_continue, continue_or_error = _parse_continue_on_error(args.get("continueOnError"))
        if bad_continue:
            return True, continue_or_error
        continue_on_error = continue_or_error

        bad_fields, fields_or_error = _resolve_candles_fields(args.get("fields"), args.get("profile"))
        if bad_fields:
            return True, fields_or_error
        fields = fields_or_error

        results: List[Dict[str, Any]] = []
        errors: List[Dict[str, Any]] = []

        for index, ticker in enumerate(tickers):
            status, payload = _http_json(
                "GET",
                "/api/clusters/candlesSeries",
                query={
                    "ticker": ticker,
                    "period": period,
                    "startDate": args.get("startDate"),
                    "endDate": args.get("endDate"),
                    "limit": limit,
                    "fields": fields,
                },
            )

            if status >= 400 or status == 0:
                errors.append(
                    {
                        "index": index,
                        "ticker": ticker,
                        "status": status,
                        "code": "HTTP_ERROR" if status >= 400 else "INTERNAL_ERROR",
                        "message": _extract_error_message(payload, "Failed to load candles series"),
                        "details": payload,
                    }
                )
                if not continue_on_error:
                    break
                continue

            results.append({"index": index, "ticker": ticker, "result": payload})

        response = {
            "results": results,
            "errors": errors,
            "meta": {
                "requested": len(tickers),
                "succeeded": len(results),
                "failed": len(errors),
                "continueOnError": continue_on_error,
                "server_time_utc": _utc_now_iso(),
                "fields": _split_csv(fields),
            },
        }

        all_failed = len(results) == 0 and len(errors) > 0
        return all_failed, response

    if name == "portfolio_markowitz":
        bad_tickers, tickers_or_error = _normalize_tickers(args.get("tickers"), max_items=50)
        if bad_tickers:
            return True, tickers_or_error
        tickers: List[str] = tickers_or_error

        bad_projection, projection_or_error = _resolve_markowitz_fields(args)
        if bad_projection:
            return True, projection_or_error
        projection_fields: List[str] = projection_or_error

        bad_risk, risk_or_error = _parse_positive_number(args.get("risk"), "risk")
        if bad_risk:
            return True, risk_or_error
        risk = risk_or_error

        start_date = args.get("startDate")
        if not isinstance(start_date, str) or not start_date.strip():
            return True, _validation_error("startDate must be a non-empty string")

        end_date = args.get("endDate")
        if not isinstance(end_date, str) or not end_date.strip():
            return True, _validation_error("endDate must be a non-empty string")

        top_n = None
        if args.get("topN") is not None:
            bad_top, top_or_error = _parse_limit(args.get("topN"), default_value=1, minimum=1, maximum=50, field="topN")
            if bad_top:
                return True, top_or_error
            top_n = top_or_error

        mode_raw = args.get("mode")
        mode = None
        if mode_raw is not None:
            if not isinstance(mode_raw, str):
                return True, _validation_error("mode must be a string", {"allowed": MARKOWITZ_ALLOWED_MODES})
            mode = mode_raw.strip().lower()
            if mode not in MARKOWITZ_ALLOWED_MODES:
                return True, _validation_error("Unknown mode", {"mode": mode, "allowed": MARKOWITZ_ALLOWED_MODES})

        risk_free_rate = args.get("riskFreeRate")
        if risk_free_rate is not None:
            try:
                risk_free_rate = float(risk_free_rate)
            except Exception:
                return True, _validation_error("riskFreeRate must be a number")

        min_weight = args.get("minWeight")
        if min_weight is not None:
            try:
                min_weight = float(min_weight)
            except Exception:
                return True, _validation_error("minWeight must be a number")
            if min_weight < 0 or min_weight > 1:
                return True, _validation_error("minWeight must be between 0 and 1")

        max_weight = args.get("maxWeight")
        if max_weight is not None:
            try:
                max_weight = float(max_weight)
            except Exception:
                return True, _validation_error("maxWeight must be a number")
            if max_weight < 0 or max_weight > 1:
                return True, _validation_error("maxWeight must be between 0 and 1")

        if min_weight is not None and max_weight is not None and min_weight > max_weight:
            return True, _validation_error("minWeight must be <= maxWeight")

        sector_max_weights = args.get("sectorMaxWeights")
        if sector_max_weights is not None and not isinstance(sector_max_weights, str):
            return True, _validation_error("sectorMaxWeights must be a string")
        if isinstance(sector_max_weights, str):
            sector_max_weights = sector_max_weights.strip() or None

        status, payload = _http_json(
            "GET",
            "/api/Portfolio/MarkovitzMcp",
            query={
                "tickers": ",".join(tickers),
                "startDate": start_date.strip(),
                "endDate": end_date.strip(),
                "risk": risk,
                "mode": mode,
                "riskFreeRate": risk_free_rate,
                "minWeight": min_weight,
                "maxWeight": max_weight,
                "sectorMaxWeights": sector_max_weights,
            },
        )
        if status >= 400 or status == 0:
            return True, payload

        if top_n is not None and isinstance(payload, dict):
            chart = payload.get("chart")
            if isinstance(chart, list):
                ranked = [item for item in chart if isinstance(item, dict)]
                ranked.sort(key=lambda item: float(item.get("percent") or 0), reverse=True)
                payload = dict(payload)
                payload["chart"] = ranked[:top_n]

        if isinstance(payload, dict):
            projected: Dict[str, Any] = {}
            for field in projection_fields:
                projected[field] = payload.get(field)
            payload = projected

        return False, payload

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
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False, "listChanged": False},
                    "logging": {},
                },
                "serverInfo": {"name": "StockChart.MCP", "version": "0.3.0"},
                "instructions": "Expose StockChart economic/fundamental dictionaries + series via tools/* and resources/*, including batch candles.",
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

    if method == "resources/list":
        return _jsonrpc_result(req_id, {"resources": _resource_defs(), "nextCursor": None})

    if method == "resources/templates/list":
        return _jsonrpc_result(req_id, {"resourceTemplates": _resource_template_defs(), "nextCursor": None})

    if method == "resources/read":
        uri = params.get("uri")
        if not isinstance(uri, str) or not uri.strip():
            return _jsonrpc_error(req_id, -32602, "Resource uri must be a non-empty string")

        is_err, payload = _read_resource(uri.strip())
        if is_err:
            if isinstance(payload, dict):
                code = payload.get("code", -32000)
                if not isinstance(code, int):
                    code = -32000
                message = payload.get("message", "Failed to read resource")
                if not isinstance(message, str) or not message:
                    message = "Failed to read resource"
                return _jsonrpc_error(req_id, code, message, payload.get("data"))
            return _jsonrpc_error(req_id, -32000, "Failed to read resource")
        return _jsonrpc_result(req_id, payload)

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
