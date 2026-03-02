# IIS Autodeploy (stockchart)

Скрипт: `tools/deploy_iis_stockchart.ps1`

Что делает:
1. Публикует `StockChart\StockChart.csproj` из исходников (`C:\corechart` по умолчанию).
   Если этот путь не существует, скрипт автоматически пробует корень репозитория относительно своей папки (`...\tools\..`).
2. Ставит `app_offline.htm`.
3. Останавливает IIS сайт и app pool.
4. Обновляет файлы в физической папке сайта (`robocopy /MIR`).
5. Удаляет `app_offline.htm`, запускает app pool и сайт.
6. Проверяет `http://localhost:5253/`.
7. Ждет запуск сайта и повторяет health-check до `HealthTimeoutSec`.
8. Отдельно копирует `tools/mcp_adapter` в IIS-папку (по умолчанию включено), чтобы MCP-bridge не падал с `MCP python script was not found`.

## Быстрый запуск

Запускать в PowerShell от администратора:

```powershell
powershell -ExecutionPolicy Bypass -File C:\sc\schart\tools\deploy_iis_stockchart.ps1 `
  -SourceRoot C:\corechart `
  -SiteName stockchart `
  -EnsureLocalhostBinding `
  -HealthTimeoutSec 90
```

## Важно

1. Скрипт использует `appcmd.exe`, нужен установленный IIS (Management Scripts and Tools).
2. Если надо сохранить локальные папки при `robocopy /MIR`, укажите:

```powershell
-ExcludeDirs logs uploads App_Data
```

3. Для MCP оставляйте HTTP:
`STOCKCHART_BASE_URL = "http://localhost:5253"`

4. Если нужно отключить копирование MCP adapter в публикацию:
```powershell
-CopyMcpAdapter $false
```

5. Если health-check продолжает падать, проверьте binding сайта:
```powershell
C:\Windows\System32\inetsrv\appcmd.exe list site stockchart /text:bindings
```
Должны быть localhost/loopback binding-ы:
- `http/*:5253:localhost`
- `http/127.0.0.1:5253:`
- `http/[::1]:5253:`
