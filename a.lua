-- QUIK -> DataProvider importer via HTTP POST.
-- Uses history + realtime merge with queueing and reconnect logic.

local script_path = "."
if getScriptPath then
    local ok, path = pcall(getScriptPath)
    if ok and path ~= nil and path ~= "" then
        script_path = path
    end
end

local function appendLuaSearchPaths(root)
    if root == nil or root == "" then
        return
    end

    package.path = package.path
        .. ";" .. root .. "\\?.lua"
        .. ";" .. root .. "\\?\\init.lua"
        .. ";" .. root .. "\\?.luac"
end

local QUIK_TERMINAL_LUA_ROOT = "C:\\quikfinam\\lua"
local QUIKSHARP_LUA_ROOT = "C:\\QUIKSharp-master\\src\\QuikSharp\\lua"

local function fileExists(path)
    local f = io.open(path, "rb")
    if f == nil then
        return false
    end
    f:close()
    return true
end

local function parseQuikVersion()
    if not getInfoParam then
        return nil, ""
    end

    local ok, v = pcall(getInfoParam, "VERSION")
    if not ok or v == nil then
        return nil, ""
    end

    local raw = tostring(v)
    local major, minor = raw:match("^(%d+)%.(%d+)")
    if major == nil then
        return nil, raw
    end

    return tonumber(major) * 100 + tonumber(minor), raw
end

local function dllRelativeSearchOrder(quik_version)
    if quik_version ~= nil and quik_version >= 811 then
        return {
            "clibs64\\54_MD\\?.dll",
            "clibs64\\54_MT\\?.dll",
            "clibs64\\53_MD\\?.dll",
            "clibs64\\53_MT\\?.dll",
            "clibs64\\5.1_MD\\?.dll",
            "clibs64\\5.1_MT\\?.dll",
            "clibs\\5.1_MD\\?.dll",
            "clibs\\5.1_MT\\?.dll"
        }
    end

    if quik_version ~= nil and quik_version >= 805 then
        return {
            "clibs64\\53_MD\\?.dll",
            "clibs64\\53_MT\\?.dll",
            "clibs64\\54_MD\\?.dll",
            "clibs64\\54_MT\\?.dll",
            "clibs64\\5.1_MD\\?.dll",
            "clibs64\\5.1_MT\\?.dll",
            "clibs\\5.1_MD\\?.dll",
            "clibs\\5.1_MT\\?.dll"
        }
    end

    if quik_version ~= nil and quik_version >= 800 then
        return {
            "clibs64\\5.1_MD\\?.dll",
            "clibs64\\5.1_MT\\?.dll",
            "clibs64\\53_MD\\?.dll",
            "clibs64\\53_MT\\?.dll",
            "clibs64\\54_MD\\?.dll",
            "clibs64\\54_MT\\?.dll",
            "clibs\\5.1_MD\\?.dll",
            "clibs\\5.1_MT\\?.dll"
        }
    end

    return {
        "clibs\\5.1_MD\\?.dll",
        "clibs\\5.1_MT\\?.dll",
        "clibs64\\5.1_MD\\?.dll",
        "clibs64\\5.1_MT\\?.dll",
        "clibs64\\53_MD\\?.dll",
        "clibs64\\53_MT\\?.dll",
        "clibs64\\54_MD\\?.dll",
        "clibs64\\54_MT\\?.dll"
    }
end

local function cpathTemplateToFile(template, module_name)
    local module_path = tostring(module_name or ""):gsub("%.", "\\")
    return tostring(template):gsub("%?", module_path)
end

local function tryLoadSocketCore(candidates)
    local base_cpath = package.cpath
    local errors = {}

    for i = 1, #candidates do
        local cpath_tpl = candidates[i]
        local dll_file = cpathTemplateToFile(cpath_tpl, "socket.core")

        if fileExists(dll_file) then
            package.loaded["socket.core"] = nil
            package.cpath = cpath_tpl .. ";" .. base_cpath

            local ok, mod_or_err = pcall(require, "socket.core")
            if ok then
                return true, cpath_tpl, ""
            end

            errors[#errors + 1] = dll_file .. " -> " .. tostring(mod_or_err)
        end
    end

    package.cpath = base_cpath
    return false, "", table.concat(errors, " || ")
end

local lua_roots = {
    script_path,
    QUIK_TERMINAL_LUA_ROOT,
    QUIKSHARP_LUA_ROOT
}

for i = 1, #lua_roots do
    appendLuaSearchPaths(lua_roots[i])
end

local quik_version_num, quik_version_raw = parseQuikVersion()
local dll_order = dllRelativeSearchOrder(quik_version_num)
local socket_core_candidates = {}
for i = 1, #lua_roots do
    local root = lua_roots[i]
    if root ~= nil and root ~= "" then
        for j = 1, #dll_order do
            socket_core_candidates[#socket_core_candidates + 1] = root .. "\\" .. dll_order[j]
        end
    end
end

local ok_socket_core, socket_core_cpath, err_socket_core = tryLoadSocketCore(socket_core_candidates)

local ok_socket, socket_or_err = pcall(require, "socket")
local socket = ok_socket and socket_or_err or nil
local err_socket = ok_socket and "" or tostring(socket_or_err)

local ok_ltn12, ltn12_or_err = pcall(require, "ltn12")
local ltn12 = ok_ltn12 and ltn12_or_err or nil
local err_ltn12 = ok_ltn12 and "" or tostring(ltn12_or_err)

local ok_http, http_or_err = pcall(require, "socket.http")
local http = ok_http and http_or_err or nil
local err_http = ok_http and "" or tostring(http_or_err)

local ok_luacom, luacom_or_err = pcall(require, "luacom")
local luacom = ok_luacom and luacom_or_err or nil
local err_luacom = ok_luacom and "" or tostring(luacom_or_err)

if ok_http then
    http.TIMEOUT = 2
end

local BASE_URLS = {
    "http://127.0.0.1:5226",
    "http://127.0.0.1:7065"
}

local ENDPOINT_MAX = "/api/quikimport/maxtrades/text"
local ENDPOINT_TRADES = "/api/quikimport/trades/text"

local HISTORY_CHUNK = 3000
local SEND_BATCH = 500
local SEND_INTERVAL_MS = 100
local MAX_SYNC_INTERVAL_MS = 15000
local RETRY_BASE_MS = 500
local RETRY_MAX_MS = 10000
local MAX_BUFFERED = 200000
local MAX_DISCONNECT_MS = 300000
local FILTER_LOG_INTERVAL_MS = 5000
local ALLOW_EXTERNAL_PROCESS_TRANSPORT = false

local TMP_DIR = getScriptPath()
local CURL_IN_FILE = TMP_DIR .. "\\quik_http_in.txt"
local CURL_OUT_FILE = TMP_DIR .. "\\quik_http_out.txt"
local PS_OUT_FILE = TMP_DIR .. "\\quik_http_ps_out.txt"
local PS_CODE_FILE = TMP_DIR .. "\\quik_http_ps_code.txt"

local running = true
local history_done = false
local rescan_total = 0
local rescan_pos = 0

local current_url_idx = 1
local disconnected = false
local disconnected_since_ts = 0
local had_success = false
local retry_delay = RETRY_BASE_MS
local next_retry_ts = 0
local last_send_ts = 0
local last_max_sync_ts = 0
local need_max_sync = true

local pending_batch = nil

local seen_trade_ids = {}
local known_tickers = {}
local max_limits = {}
local curl_available = nil
local curl_bin = nil
local powershell_available = nil
local transport_name = "none"
local filtered_by_limit_total = 0
local filtered_by_limit_since_log = 0
local last_filtered_log_ts = 0
local last_max_limits_summary = ""

local function shellQuote(value)
    local v = tostring(value or "")
    v = v:gsub("\"", "\"\"")
    return "\"" .. v .. "\""
end

local function psSingleQuote(value)
    local v = tostring(value or "")
    v = v:gsub("'", "''")
    return "'" .. v .. "'"
end

local function writeTextFile(path, text)
    local f = io.open(path, "wb")
    if f == nil then
        return false
    end

    f:write(text or "")
    f:close()
    return true
end

local function readTextFile(path)
    local f = io.open(path, "rb")
    if f == nil then
        return ""
    end

    local text = f:read("*a") or ""
    f:close()
    return text
end

local function canUseCurl()
    if curl_available ~= nil then
        return curl_available
    end

    local candidates = { "curl", "%SystemRoot%\\System32\\curl.exe" }
    for i = 1, #candidates do
        local candidate = candidates[i]
        local p = io.popen("cmd /C " .. candidate .. " --version 2>nul", "r")
        if p ~= nil then
            local out = p:read("*a") or ""
            p:close()
            if out ~= "" then
                curl_bin = candidate
                curl_available = true
                return true
            end
        end
    end

    curl_available = false
    return false
end

local function canUsePowerShell()
    if powershell_available ~= nil then
        return powershell_available
    end

    local p = io.popen("powershell -NoProfile -NonInteractive -Command \"$PSVersionTable.PSVersion.Major\" 2>nul", "r")
    if p == nil then
        powershell_available = false
        return false
    end

    local out = p:read("*a") or ""
    p:close()
    out = out:gsub("%s+", "")
    powershell_available = out ~= ""
    return powershell_available
end

local function postViaLuaSocket(url, body)
    if not ok_http or not ok_ltn12 then
        return false, 0, "", "luasocket_not_available"
    end

    local response = {}
    local ok, code, _, status = http.request({
        url = url,
        method = "POST",
        headers = {
            ["Content-Type"] = "text/plain",
            ["Content-Length"] = tostring(#body)
        },
        source = ltn12.source.string(body),
        sink = ltn12.sink.table(response)
    })

    local numeric_code = tonumber(code) or 0
    if ok ~= nil and numeric_code >= 200 and numeric_code < 300 then
        return true, numeric_code, table.concat(response), status
    end

    return false, numeric_code, table.concat(response), status
end

local function parseHttpUrl(url)
    local host, port, path = url:match("^http://([^:/]+):(%d+)(/.*)$")
    if host ~= nil then
        return host, tonumber(port) or 80, path
    end

    host, path = url:match("^http://([^/]+)(/.*)$")
    if host ~= nil then
        return host, 80, path
    end

    host, port = url:match("^http://([^:/]+):(%d+)$")
    if host ~= nil then
        return host, tonumber(port) or 80, "/"
    end

    host = url:match("^http://([^/]+)$")
    if host ~= nil then
        return host, 80, "/"
    end

    return nil, nil, nil
end

local function decodeChunkedBody(body)
    local pos = 1
    local chunks = {}

    while true do
        local line_end = body:find("\r\n", pos, true)
        if line_end == nil then
            break
        end

        local size_hex = body:sub(pos, line_end - 1):match("^%s*([0-9a-fA-F]+)")
        if size_hex == nil then
            break
        end

        local size = tonumber(size_hex, 16) or 0
        pos = line_end + 2

        if size == 0 then
            break
        end

        local chunk = body:sub(pos, pos + size - 1)
        if #chunk < size then
            break
        end

        chunks[#chunks + 1] = chunk
        pos = pos + size + 2
    end

    return table.concat(chunks)
end

local function parseHttpResponse(raw)
    if raw == nil or raw == "" then
        return 0, "", {}
    end

    local header_end = raw:find("\r\n\r\n", 1, true)
    if header_end == nil then
        return 0, "", {}
    end

    local header_text = raw:sub(1, header_end - 1)
    local body = raw:sub(header_end + 4)
    local headers = {}

    local first = true
    local status_code = 0
    for line in header_text:gmatch("[^\r\n]+") do
        if first then
            first = false
            status_code = tonumber(line:match("%s(%d%d%d)%s")) or 0
        else
            local k, v = line:match("^([^:]+):%s*(.*)$")
            if k ~= nil then
                headers[string.lower(k)] = v
            end
        end
    end

    local te = headers["transfer-encoding"]
    if te ~= nil and string.lower(te):find("chunked", 1, true) ~= nil then
        body = decodeChunkedBody(body)
    else
        local content_length = tonumber(headers["content-length"] or "")
        if content_length ~= nil and content_length >= 0 then
            body = body:sub(1, content_length)
        end
    end

    return status_code, body, headers
end

local function postViaRawSocket(url, body)
    if not ok_socket then
        return false, 0, "", "socket_not_available"
    end

    local host, port, path = parseHttpUrl(url)
    if host == nil then
        return false, 0, "", "invalid_url"
    end

    local tcp, create_err = socket.tcp()
    if tcp == nil then
        return false, 0, "", tostring(create_err or "socket_create_failed")
    end

    tcp:settimeout(2)

    local connected, connect_err = tcp:connect(host, port)
    if connected == nil then
        tcp:close()
        return false, 0, "", tostring(connect_err or "connect_failed")
    end

    local req = "POST " .. path .. " HTTP/1.1\r\n"
        .. "Host: " .. host .. ":" .. tostring(port) .. "\r\n"
        .. "Content-Type: text/plain; charset=utf-8\r\n"
        .. "Content-Length: " .. tostring(#body) .. "\r\n"
        .. "Connection: close\r\n\r\n"
        .. body

    local sent, send_err = tcp:send(req)
    if sent == nil then
        tcp:close()
        return false, 0, "", tostring(send_err or "send_failed")
    end

    local parts = {}
    while true do
        local chunk, recv_err, partial = tcp:receive(8192)
        if chunk ~= nil and #chunk > 0 then
            parts[#parts + 1] = chunk
        end

        if partial ~= nil and #partial > 0 then
            parts[#parts + 1] = partial
        end

        if recv_err == "closed" then
            break
        end

        if recv_err == "timeout" then
            break
        end

        if recv_err ~= nil then
            break
        end
    end

    tcp:close()

    local status_code, response_body = parseHttpResponse(table.concat(parts))
    if status_code >= 200 and status_code < 300 then
        return true, status_code, response_body, "rawsocket_ok"
    end

    return false, status_code, response_body, "status_" .. tostring(status_code)
end

local function postViaWinHttp(url, body)
    if not ok_luacom then
        return false, 0, "", "luacom_not_available"
    end

    local ok_call, status_code, response_text = pcall(function()
        local req = luacom.CreateObject("WinHttp.WinHttpRequest.5.1")
        req:SetTimeouts(2000, 2000, 2000, 2000)
        req:Open("POST", url, false)
        req:SetRequestHeader("Content-Type", "text/plain")
        req:Send(body)

        local code = tonumber(req.Status) or 0
        local response = tostring(req.ResponseText or "")
        return code, response
    end)

    if not ok_call then
        return false, 0, "", tostring(status_code)
    end

    if status_code >= 200 and status_code < 300 then
        return true, status_code, response_text, "winhttp_ok"
    end

    return false, status_code, response_text, "status_" .. tostring(status_code)
end

local function postViaCurl(url, body)
    if not canUseCurl() then
        return false, 0, "", "curl_not_available"
    end

    if not writeTextFile(CURL_IN_FILE, body) then
        return false, 0, "", "curl_write_failed"
    end

    os.remove(CURL_OUT_FILE)

    local cmd = "cmd /C curl -sS -o "
        .. shellQuote(CURL_OUT_FILE)
        .. " -w \"%{http_code}\" -X POST -H \"Content-Type: text/plain\" --data-binary "
        .. shellQuote("@" .. CURL_IN_FILE)
        .. " "
        .. shellQuote(url)
        .. " 2>nul"

    if curl_bin ~= nil and curl_bin ~= "curl" then
        cmd = "cmd /C " .. curl_bin .. " -sS -o "
        .. shellQuote(CURL_OUT_FILE)
        .. " -w \"%{http_code}\" -X POST -H \"Content-Type: text/plain\" --data-binary "
        .. shellQuote("@" .. CURL_IN_FILE)
        .. " "
        .. shellQuote(url)
        .. " 2>nul"
    end

    local p = io.popen(cmd, "r")
    if p == nil then
        return false, 0, "", "curl_exec_failed"
    end

    local code_text = p:read("*a") or ""
    p:close()
    code_text = string.gsub(code_text, "%s+", "")

    local status_code = tonumber(code_text) or 0
    local response_text = readTextFile(CURL_OUT_FILE)

    if status_code >= 200 and status_code < 300 then
        return true, status_code, response_text, "curl_ok"
    end

    return false, status_code, response_text, "status_" .. tostring(status_code)
end

local function postViaPowerShell(url, body)
    if not canUsePowerShell() then
        return false, 0, "", "powershell_not_available"
    end

    if not writeTextFile(CURL_IN_FILE, body) then
        return false, 0, "", "ps_write_failed"
    end

    os.remove(PS_OUT_FILE)
    os.remove(PS_CODE_FILE)

    local script =
        "$ErrorActionPreference='Stop';" ..
        "$uri=" .. psSingleQuote(url) .. ";" ..
        "$inPath=" .. psSingleQuote(CURL_IN_FILE) .. ";" ..
        "$outPath=" .. psSingleQuote(PS_OUT_FILE) .. ";" ..
        "$codePath=" .. psSingleQuote(PS_CODE_FILE) .. ";" ..
        "$body=[System.IO.File]::ReadAllText($inPath,[System.Text.Encoding]::UTF8);" ..
        "try{" ..
        "$resp=Invoke-WebRequest -UseBasicParsing -Uri $uri -Method Post -ContentType 'text/plain; charset=utf-8' -Body $body -TimeoutSec 5;" ..
        "[System.IO.File]::WriteAllText($outPath,[string]$resp.Content,[System.Text.Encoding]::UTF8);" ..
        "[System.IO.File]::WriteAllText($codePath,[string]$resp.StatusCode,[System.Text.Encoding]::ASCII);" ..
        "}catch{" ..
        "$sc=0;$txt='';" ..
        "if($_.Exception.Response -ne $null){" ..
        "try{$sc=[int]$_.Exception.Response.StatusCode}catch{};" ..
        "try{$sr=New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream());$txt=$sr.ReadToEnd();$sr.Close()}catch{}" ..
        "};" ..
        "[System.IO.File]::WriteAllText($outPath,$txt,[System.Text.Encoding]::UTF8);" ..
        "[System.IO.File]::WriteAllText($codePath,[string]$sc,[System.Text.Encoding]::ASCII);" ..
        "}"

    local cmd = "powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command " .. shellQuote(script)
    local exec_ok = os.execute(cmd)
    if exec_ok == nil then
        return false, 0, "", "powershell_exec_failed"
    end

    local code_text = readTextFile(PS_CODE_FILE):gsub("%s+", "")
    local status_code = tonumber(code_text) or 0
    local response_text = readTextFile(PS_OUT_FILE)

    if status_code >= 200 and status_code < 300 then
        return true, status_code, response_text, "powershell_ok"
    end

    return false, status_code, response_text, "status_" .. tostring(status_code)
end

local function postUsingTransport(name, url, body)
    if name == "luasocket" then
        return postViaLuaSocket(url, body)
    end

    if name == "rawsocket" then
        return postViaRawSocket(url, body)
    end

    if name == "winhttp" then
        return postViaWinHttp(url, body)
    end

    if name == "curl" then
        return postViaCurl(url, body)
    end

    if name == "powershell" then
        return postViaPowerShell(url, body)
    end

    return false, 0, "", "unknown_transport"
end

local function currentTransportOrder()
    if transport_name == "luasocket" then
        if ALLOW_EXTERNAL_PROCESS_TRANSPORT then
            return { "luasocket", "rawsocket", "winhttp", "powershell", "curl" }
        end
        return { "luasocket", "rawsocket", "winhttp" }
    end

    if transport_name == "rawsocket" then
        if ALLOW_EXTERNAL_PROCESS_TRANSPORT then
            return { "rawsocket", "luasocket", "winhttp", "powershell", "curl" }
        end
        return { "rawsocket", "luasocket", "winhttp" }
    end

    if transport_name == "winhttp" then
        if ALLOW_EXTERNAL_PROCESS_TRANSPORT then
            return { "winhttp", "rawsocket", "luasocket", "powershell", "curl" }
        end
        return { "winhttp", "rawsocket", "luasocket" }
    end

    if transport_name == "powershell" then
        if ALLOW_EXTERNAL_PROCESS_TRANSPORT then
            return { "powershell", "winhttp", "rawsocket", "luasocket", "curl" }
        end
        return { "winhttp", "rawsocket", "luasocket" }
    end

    if transport_name == "curl" then
        if ALLOW_EXTERNAL_PROCESS_TRANSPORT then
            return { "curl", "powershell", "winhttp", "rawsocket", "luasocket" }
        end
        return { "winhttp", "rawsocket", "luasocket" }
    end

    if ALLOW_EXTERNAL_PROCESS_TRANSPORT then
        return { "luasocket", "rawsocket", "winhttp", "powershell", "curl" }
    end
    return { "luasocket", "rawsocket", "winhttp" }
end

local function nowMs()
    if ok_socket and socket.gettime then
        return math.floor(socket.gettime() * 1000)
    end
    return os.time() * 1000
end

local function qNew()
    return { first = 0, last = -1, data = {} }
end

local function qLen(q)
    return q.last - q.first + 1
end

local function qPush(q, value)
    local last = q.last + 1
    q.last = last
    q.data[last] = value
end

local function qPop(q)
    local first = q.first
    if first > q.last then
        return nil
    end

    local value = q.data[first]
    q.data[first] = nil
    q.first = first + 1
    return value
end

local historyQ = qNew()
local liveQ = qNew()
local sendQ = qNew()

local function toTicker(sec_code)
    if sec_code == nil then
        return ""
    end

    return tostring(sec_code):upper()
end

local function tradeKey(tr)
    return tr.ticker .. "|" .. tostring(tr.trade_num)
end

local function registerTrade(tr)
    local key = tradeKey(tr)
    if seen_trade_ids[key] then
        return false
    end

    seen_trade_ids[key] = true
    return true
end

local function normalizeTrade(src)
    if src == nil then
        return nil
    end

    local ticker = toTicker(src.sec_code)
    if ticker == "" then
        return nil
    end

    local trade_num = src.trade_num or src.tradenum or src.trade_no
    if trade_num == nil then
        return nil
    end

    local dt = src.datetime
    if dt == nil then
        return nil
    end

    local price = tonumber(src.price)
    local qty = tonumber(src.qty)
    if price == nil or qty == nil or price <= 0 or qty <= 0 then
        return nil
    end

    local flags = tonumber(src.flags) or 0
    local direction = (flags % 2 == 1) and 1 or 0

    return {
        ticker = ticker,
        class_code = src.class_code and tostring(src.class_code):upper() or "",
        trade_num = math.floor(tonumber(trade_num) or 0),
        dt = dt,
        price = price,
        qty = qty,
        flags = flags,
        direction = direction
    }
end

local function decimalToString(value)
    local s = string.format("%.10f", tonumber(value) or 0)
    s = s:gsub("(%..-)0+$", "%1")
    s = s:gsub("%.$", "")
    return s
end

local function toUnixMs(dt)
    if dt == nil then
        return 0
    end

    local sec = os.time({
        year = dt.year,
        month = dt.month,
        day = dt.day,
        hour = dt.hour,
        min = dt.min,
        sec = dt.sec,
        isdst = false
    })

    if sec == nil then
        return 0
    end

    local ms = tonumber(dt.ms) or tonumber(dt.mcs) or 0
    if ms > 999 then
        ms = math.floor(ms / 1000)
    end

    return sec * 1000 + math.floor(ms)
end

local function postText(path, body)
    local transports = currentTransportOrder()
    for i = 0, #BASE_URLS - 1 do
        local idx = ((current_url_idx - 1 + i) % #BASE_URLS) + 1
        local url = BASE_URLS[idx] .. path

        for t = 1, #transports do
            local tname = transports[t]
            local ok, code, response, status = postUsingTransport(tname, url, body)
            if ok then
                current_url_idx = idx
                transport_name = tname
                return true, code, response, status
            end
        end
    end

    return false, 0, "", "all_endpoints_failed"
end

local function scheduleRescan(reason)
    rescan_total = getNumberOf("all_trades") or 0
    rescan_pos = 0
    history_done = false
    message("QUIK import: history rescan " .. tostring(reason) .. ", rows=" .. tostring(rescan_total), 1)
end

local function collectTickers()
    local tickers = {}
    for ticker, _ in pairs(known_tickers) do
        tickers[#tickers + 1] = ticker
    end

    table.sort(tickers)
    return tickers
end

local function syncMaxTrades(now_ts)
    local tickers = collectTickers()
    if #tickers == 0 then
        need_max_sync = false
        last_max_sync_ts = now_ts
        return true
    end

    local chunk_size = 500
    for i = 1, #tickers, chunk_size do
        local max_i = math.min(i + chunk_size - 1, #tickers)
        local payload = table.concat(tickers, "\n", i, max_i)

        local ok, _, response = postText(ENDPOINT_MAX, payload)
        if not ok then
            disconnected = true
            if disconnected_since_ts == 0 then
                disconnected_since_ts = now_ts
            end
            need_max_sync = true
            next_retry_ts = now_ts + retry_delay
            retry_delay = math.min(retry_delay * 2, RETRY_MAX_MS)
            return false
        end

        for line in response:gmatch("[^\r\n]+") do
            local ticker, has_limit_s, max_s = line:match("^([^|]+)|([^|]+)|([^|]+)$")
            if ticker ~= nil then
                local has_limit = has_limit_s == "1"
                local max_number = tonumber(max_s) or 0
                local current = max_limits[ticker]

                if current == nil then
                    max_limits[ticker] = {
                        has_limit = has_limit,
                        max = max_number
                    }
                else
                    if has_limit then
                        current.has_limit = true
                        current.max = math.max(current.max or 0, max_number)
                    else
                        current.has_limit = false
                    end
                end
            end
        end
    end

    local with_limit = 0
    for i = 1, #tickers do
        local ticker = tickers[i]
        local limit = max_limits[ticker]
        if limit ~= nil and limit.has_limit then
            with_limit = with_limit + 1
        end
    end

    local without_limit = #tickers - with_limit
    local summary_key = tostring(#tickers) .. "|" .. tostring(with_limit) .. "|" .. tostring(without_limit)
    if summary_key ~= last_max_limits_summary then
        message(
            "QUIK import: maxtrades sync tickers=" .. tostring(#tickers)
                .. ", with_limit=" .. tostring(with_limit)
                .. ", without_limit=" .. tostring(without_limit),
            1
        )
        last_max_limits_summary = summary_key
    end

    disconnected = false
    disconnected_since_ts = 0
    need_max_sync = false
    retry_delay = RETRY_BASE_MS
    next_retry_ts = 0
    last_max_sync_ts = now_ts
    return true
end

local function shouldPassLimit(tr)
    local limit = max_limits[tr.ticker]
    if limit == nil then
        return true
    end

    if limit.has_limit and tr.trade_num <= (limit.max or 0) then
        return false
    end

    return true
end

local function advanceLimit(tr)
    local limit = max_limits[tr.ticker]
    if limit == nil then
        max_limits[tr.ticker] = {
            has_limit = true,
            max = tr.trade_num
        }
        return
    end

    if tr.trade_num > (limit.max or 0) then
        limit.max = tr.trade_num
        limit.has_limit = true
    end
end

local function buildPendingBatch()
    local batch = {}

    while #batch < SEND_BATCH do
        local tr = qPop(sendQ)
        if tr == nil then
            break
        end

        if shouldPassLimit(tr) then
            batch[#batch + 1] = tr
        end
    end

    if #batch == 0 then
        return nil
    end

    return batch
end

local function filterBatchByLimits(batch)
    if batch == nil or #batch == 0 then
        return nil, 0
    end

    local filtered = {}
    local dropped = 0
    for i = 1, #batch do
        local tr = batch[i]
        if shouldPassLimit(tr) then
            filtered[#filtered + 1] = tr
        else
            dropped = dropped + 1
        end
    end

    if #filtered == 0 then
        return nil, dropped
    end

    return filtered, dropped
end

local function encodeBatch(batch)
    local lines = {}

    for i = 1, #batch do
        local tr = batch[i]
        local line = string.format(
            "%s|%s|%d|%d|%s|%s|%d|%d",
            tr.ticker,
            tr.class_code,
            tr.trade_num,
            toUnixMs(tr.dt),
            decimalToString(tr.price),
            decimalToString(tr.qty),
            tr.direction,
            tr.flags
        )

        lines[#lines + 1] = line
    end

    return table.concat(lines, "\n")
end

local function trySendPending(now_ts)
    if pending_batch == nil or #pending_batch == 0 then
        pending_batch = nil
        return true
    end

    if need_max_sync and not syncMaxTrades(now_ts) then
        return false
    end

    local dropped_by_limit = 0
    pending_batch, dropped_by_limit = filterBatchByLimits(pending_batch)
    if dropped_by_limit ~= nil and dropped_by_limit > 0 then
        filtered_by_limit_total = filtered_by_limit_total + dropped_by_limit
        filtered_by_limit_since_log = filtered_by_limit_since_log + dropped_by_limit
    end
    if pending_batch == nil then
        return true
    end

    local payload = encodeBatch(pending_batch)
    local ok = false
    ok = postText(ENDPOINT_TRADES, payload)

    if ok then
        for i = 1, #pending_batch do
            advanceLimit(pending_batch[i])
        end

        local was_disconnected = disconnected
        pending_batch = nil
        disconnected = false
        disconnected_since_ts = 0
        retry_delay = RETRY_BASE_MS
        next_retry_ts = 0
        last_send_ts = now_ts

        if had_success and was_disconnected then
            need_max_sync = true
            scheduleRescan("after_reconnect")
        end

        had_success = true
        return true
    end

    disconnected = true
    if disconnected_since_ts == 0 then
        disconnected_since_ts = now_ts
    end
    need_max_sync = true
    next_retry_ts = now_ts + retry_delay
    retry_delay = math.min(retry_delay * 2, RETRY_MAX_MS)
    return false
end

local function scanHistoryChunk()
    local scanned = 0

    while rescan_pos < rescan_total and scanned < HISTORY_CHUNK do
        local item = getItem("all_trades", rescan_pos)
        local tr = normalizeTrade(item)

        if tr ~= nil and tr.trade_num > 0 then
            known_tickers[tr.ticker] = true
            if registerTrade(tr) then
                qPush(historyQ, tr)
            end
        end

        rescan_pos = rescan_pos + 1
        scanned = scanned + 1
    end

    if rescan_pos >= rescan_total then
        history_done = true
    end
end

local function moveInputToSendQueue()
    local moved = 0

    while qLen(historyQ) > 0 and moved < 2000 do
        local tr = qPop(historyQ)
        if tr ~= nil then
            qPush(sendQ, tr)
        end
        moved = moved + 1
    end

    if history_done and qLen(historyQ) == 0 then
        while qLen(liveQ) > 0 and moved < 4000 do
            local tr = qPop(liveQ)
            if tr ~= nil then
                qPush(sendQ, tr)
            end
            moved = moved + 1
        end
    end
end

function OnInit()
    if quik_version_raw ~= nil and quik_version_raw ~= "" then
        message("QUIK import QUIK version: " .. quik_version_raw .. " (" .. tostring(quik_version_num or 0) .. ")", 1)
    end

    if ok_socket_core then
        message("QUIK import socket.core cpath: " .. tostring(socket_core_cpath), 1)
    elseif err_socket_core ~= nil and err_socket_core ~= "" then
        message("socket.core probe errors: " .. err_socket_core, 3)
    end

    message("QUIK import modules: socket=" .. tostring(ok_socket) .. ", socket.http=" .. tostring(ok_http and ok_ltn12) .. ", luacom=" .. tostring(ok_luacom), 1)
    if not ok_socket then
        message("socket require error: " .. err_socket, 3)
    end
    if not ok_http then
        message("socket.http require error: " .. err_http, 3)
    end
    if not ok_ltn12 then
        message("ltn12 require error: " .. err_ltn12, 3)
    end
    if not ok_luacom then
        message("luacom require error: " .. err_luacom, 1)
    end

    if ok_http and ok_ltn12 then
        transport_name = "luasocket"
    elseif ok_socket then
        transport_name = "rawsocket"
    elseif ok_luacom then
        transport_name = "winhttp"
    elseif ALLOW_EXTERNAL_PROCESS_TRANSPORT and canUsePowerShell() then
        transport_name = "powershell"
    elseif ALLOW_EXTERNAL_PROCESS_TRANSPORT and canUseCurl() then
        transport_name = "curl"
    else
        transport_name = "none"
    end

    if transport_name == "none" then
        if ALLOW_EXTERNAL_PROCESS_TRANSPORT then
            message("QUIK import: HTTP transport not found (need socket OR socket.http+ltn12 OR luacom OR PowerShell OR curl.exe)", 3)
        else
            message("QUIK import: HTTP transport not found (need socket OR socket.http+ltn12 OR luacom). External process transport disabled.", 3)
        end
        running = false
        return
    end

    message("QUIK import: started, transport=" .. transport_name, 1)
    scheduleRescan("startup")
end

function OnAllTrade(trade)
    if not running then
        return
    end

    local tr = normalizeTrade(trade)
    if tr == nil or tr.trade_num <= 0 then
        return
    end

    known_tickers[tr.ticker] = true

    if not registerTrade(tr) then
        return
    end

    qPush(liveQ, tr)

    if qLen(historyQ) + qLen(liveQ) + qLen(sendQ) >= MAX_BUFFERED then
        running = false
        message("QUIK import: buffer limit reached, script stopped to avoid data loss", 3)
        return
    end
end

function OnStop()
    running = false
    message("QUIK import: stopped", 1)
end

function main()
    while running do
        local now_ts = nowMs()

        if not history_done then
            scanHistoryChunk()
        end

        moveInputToSendQueue()

        if now_ts >= next_retry_ts and (need_max_sync or (now_ts - last_max_sync_ts) >= MAX_SYNC_INTERVAL_MS) then
            syncMaxTrades(now_ts)
        end

        if filtered_by_limit_since_log > 0 and (now_ts - last_filtered_log_ts) >= FILTER_LOG_INTERVAL_MS then
            message("QUIK import: maxtrades filtered " .. tostring(filtered_by_limit_since_log) .. " trades (total " .. tostring(filtered_by_limit_total) .. ")", 1)
            filtered_by_limit_since_log = 0
            last_filtered_log_ts = now_ts
        end

        if disconnected and disconnected_since_ts > 0 and (now_ts - disconnected_since_ts) >= MAX_DISCONNECT_MS then
            running = false
            message("QUIK import: DataProvider disconnected for " .. tostring(math.floor((now_ts - disconnected_since_ts) / 1000)) .. "s, script stopped to avoid data loss", 3)
            break
        end

        if pending_batch == nil then
            local queue_size = qLen(sendQ)
            if queue_size >= SEND_BATCH or (queue_size > 0 and (now_ts - last_send_ts) >= SEND_INTERVAL_MS) then
                pending_batch = buildPendingBatch()
            end
        end

        if pending_batch ~= nil and now_ts >= next_retry_ts then
            trySendPending(now_ts)
        end

        if qLen(historyQ) == 0 and qLen(liveQ) == 0 and qLen(sendQ) == 0 and pending_batch == nil then
            sleep(20)
        else
            sleep(1)
        end
    end
end
