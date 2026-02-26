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

local BASE_URLS = {
    "http://127.0.0.1:5226",
    "http://127.0.0.1:7065"
}

local ENDPOINT_TRADES = "/api/quikimport/trades/text"
local ENDPOINT_HISTORY_FROM = "/api/quikimport/historyfrom/text"

local HISTORY_CHUNK = 3000
local SEND_BATCH = 500
local SEND_INTERVAL_MS = 100
local RETRY_BASE_MS = 500
local RETRY_MAX_MS = 10000
local MAX_BUFFERED = 200000
local MAX_DISCONNECT_MS = 300000
local ALLOW_EXTERNAL_PROCESS_TRANSPORT = false
local HTTP_TIMEOUT_SEC = 10
local HTTP_TIMEOUT_MS = HTTP_TIMEOUT_SEC * 1000

if ok_http then
    http.TIMEOUT = HTTP_TIMEOUT_SEC
end

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
local need_history_sync = true
local history_sync_reason = "startup"
local history_from_ts = 0

local pending_batch = nil

local seen_trade_ids = {}
local known_tickers = {}
local curl_available = nil
local curl_bin = nil
local powershell_available = nil
local transport_name = "none"

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

    tcp:settimeout(HTTP_TIMEOUT_SEC)

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
        req:SetTimeouts(HTTP_TIMEOUT_MS, HTTP_TIMEOUT_MS, HTTP_TIMEOUT_MS, HTTP_TIMEOUT_MS)
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

    local cmd = "cmd /C curl -sS --max-time "
        .. tostring(HTTP_TIMEOUT_SEC)
        .. " -o "
        .. shellQuote(CURL_OUT_FILE)
        .. " -w \"%{http_code}\" -X POST -H \"Content-Type: text/plain\" --data-binary "
        .. shellQuote("@" .. CURL_IN_FILE)
        .. " "
        .. shellQuote(url)
        .. " 2>nul"

    if curl_bin ~= nil and curl_bin ~= "curl" then
        cmd = "cmd /C " .. curl_bin .. " -sS --max-time "
        .. tostring(HTTP_TIMEOUT_SEC)
        .. " -o "
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
        "$resp=Invoke-WebRequest -UseBasicParsing -Uri $uri -Method Post -ContentType 'text/plain; charset=utf-8' -Body $body -TimeoutSec " .. tostring(HTTP_TIMEOUT_SEC) .. ";" ..
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
    local oi = tonumber(src.open_interest)
        or tonumber(src.openinterest)
        or tonumber(src.oi)
        or tonumber(src.OI)
        or 0
    oi = math.floor(oi)
    if oi < 0 then
        oi = 0
    end

    return {
        ticker = ticker,
        class_code = src.class_code and tostring(src.class_code):upper() or "",
        trade_num = math.floor(tonumber(trade_num) or 0),
        dt = dt,
        price = price,
        qty = qty,
        oi = oi,
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

local function tradeUnixMs(item)
    if item == nil or item.datetime == nil then
        return 0
    end

    return toUnixMs(item.datetime)
end

local function findHistoryStartPos(total, from_ts)
    if total <= 0 or from_ts <= 0 then
        return 0
    end

    local left = 0
    local right = total - 1
    local answer = total

    while left <= right do
        local mid = math.floor((left + right) / 2)
        local item = getItem("all_trades", mid)
        local item_ts = tradeUnixMs(item)

        if item_ts > 0 and item_ts >= from_ts then
            answer = mid
            right = mid - 1
        else
            left = mid + 1
        end
    end

    if answer < 0 then
        return 0
    end

    if answer > total then
        return total
    end

    return answer
end

local function scheduleRescan(reason, from_ts)
    rescan_total = getNumberOf("all_trades") or 0
    local start_ts = tonumber(from_ts) or 0
    if start_ts < 0 then
        start_ts = 0
    end

    rescan_pos = findHistoryStartPos(rescan_total, start_ts)
    history_done = false

    message(
        "QUIK import: history rescan " .. tostring(reason)
            .. ", rows=" .. tostring(rescan_total)
            .. ", from_ts=" .. tostring(start_ts)
            .. ", start_pos=" .. tostring(rescan_pos),
        1
    )
end

local function syncHistoryFrom(now_ts)
    local ok, _, response = postText(ENDPOINT_HISTORY_FROM, "")
    if not ok then
        disconnected = true
        if disconnected_since_ts == 0 then
            disconnected_since_ts = now_ts
        end
        next_retry_ts = now_ts + retry_delay
        retry_delay = math.min(retry_delay * 2, RETRY_MAX_MS)
        return false
    end

    local text = tostring(response or ""):gsub("%s+", "")
    local from_ts = tonumber(text) or 0
    if from_ts < 0 then
        from_ts = 0
    end

    history_from_ts = from_ts
    disconnected = false
    disconnected_since_ts = 0
    retry_delay = RETRY_BASE_MS
    next_retry_ts = 0
    need_history_sync = false

    local reason = history_sync_reason
    if reason == nil or reason == "" then
        reason = "history_sync"
    end
    history_sync_reason = ""
    scheduleRescan(reason, history_from_ts)
    return true
end

local function buildPendingBatch()
    local batch = {}

    while #batch < SEND_BATCH do
        local tr = qPop(sendQ)
        if tr == nil then
            break
        end

        batch[#batch + 1] = tr
    end

    if #batch == 0 then
        return nil
    end

    return batch
end

local function encodeBatch(batch)
    local lines = {}

    for i = 1, #batch do
        local tr = batch[i]
        local line = string.format(
            "%s|%s|%d|%d|%s|%s|%d|%d|%d",
            tr.ticker,
            tr.class_code,
            tr.trade_num,
            toUnixMs(tr.dt),
            decimalToString(tr.price),
            decimalToString(tr.qty),
            tr.direction,
            tr.flags,
            tr.oi or 0
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

    local payload = encodeBatch(pending_batch)
    local ok = false
    ok = postText(ENDPOINT_TRADES, payload)

    if ok then
        local was_disconnected = disconnected
        pending_batch = nil
        disconnected = false
        disconnected_since_ts = 0
        retry_delay = RETRY_BASE_MS
        next_retry_ts = 0
        last_send_ts = now_ts

        if had_success and was_disconnected then
            need_history_sync = true
            history_sync_reason = "after_reconnect"
        end

        had_success = true
        return true
    end

    disconnected = true
    if disconnected_since_ts == 0 then
        disconnected_since_ts = now_ts
    end
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

    if history_done and qLen(historyQ) == 0 and not need_history_sync then
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
    need_history_sync = true
    history_sync_reason = "startup"
    history_from_ts = 0
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

        if need_history_sync and now_ts >= next_retry_ts then
            syncHistoryFrom(now_ts)
        end

        if not history_done and not need_history_sync then
            scanHistoryChunk()
        end

        moveInputToSendQueue()

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
