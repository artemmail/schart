param(
    [string]$SourceRoot = "C:\sc\schart",
    [string]$ProjectRelativePath = "StockChart\StockChart.csproj",
    [string]$McpAdapterRelativePath = "tools\mcp_adapter",
    [bool]$CopyMcpAdapter = $true,
    [string]$SiteName = "stockchart",
    [string]$AppPool = "",
    [string]$TargetPath = "",
    [string]$Configuration = "Release",
    [string]$PublishOutput = "",
    [string]$LocalHealthUrl = "http://localhost:5253/",
    [int]$HealthTimeoutSec = 60,
    [int]$HealthRetryDelaySec = 2,
    [switch]$EnsureLocalhostBinding,
    [switch]$SkipBuild,
    [string[]]$ExcludeDirs = @(),
    [int]$StopTimeoutSec = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$message)
{
    Write-Host "[deploy] $message"
}

function Resolve-AppCmdPath
{
    $path = Join-Path $env:windir "System32\inetsrv\appcmd.exe"
    if (Test-Path $path)
    {
        return $path
    }

    throw "IIS appcmd not found: $path. Install IIS Management Scripts and Tools."
}

function Invoke-AppCmd([string]$appCmdPath, [string[]]$arguments)
{
    $output = & $appCmdPath @arguments 2>&1
    if ($LASTEXITCODE -ne 0)
    {
        throw "appcmd failed: $($arguments -join ' ')`n$output"
    }

    return ($output | Out-String).Trim()
}

function Get-AppPoolState([string]$appCmdPath, [string]$poolName)
{
    return (Invoke-AppCmd $appCmdPath @("list", "apppool", $poolName, "/text:state")).Trim()
}

function Expand-PathValue([string]$raw)
{
    $expanded = [Environment]::ExpandEnvironmentVariables($raw)
    return $expanded.Trim().Trim('"')
}

function Ensure-SiteBinding(
    [string]$appCmdPath,
    [string]$siteName,
    [string]$protocol,
    [string]$bindingInformation,
    [string]$existingBindingRegex,
    [string]$displayName
)
{
    $bindings = Invoke-AppCmd $appCmdPath @("list", "site", $siteName, "/text:bindings")
    if ($bindings -match $existingBindingRegex)
    {
        Write-Step "Binding already exists: $displayName"
        return
    }

    Write-Step "Adding binding: $displayName"
    Invoke-AppCmd $appCmdPath @(
        "set",
        "site",
        "/site.name:$siteName",
        "/+bindings.[protocol='$protocol',bindingInformation='$bindingInformation']"
    ) | Out-Null
}

function Ensure-LocalhostHttpBinding([string]$appCmdPath, [string]$siteName)
{
    # Host-based localhost binding avoids collisions when multiple IIS sites use the same port.
    Ensure-SiteBinding $appCmdPath $siteName "http" "*:5253:localhost" "http/\*:5253:localhost" "http/*:5253:localhost"
    Ensure-SiteBinding $appCmdPath $siteName "http" "127.0.0.1:5253:" "http/127\.0\.0\.1:5253:" "http/127.0.0.1:5253:"
    Ensure-SiteBinding $appCmdPath $siteName "http" "[::1]:5253:" "http/\[::1\]:5253:" "http/[::1]:5253:"
}

function Wait-Health([string]$url, [int]$timeoutSec, [int]$retryDelaySec)
{
    $started = Get-Date
    $lastError = $null

    while (((Get-Date) - $started).TotalSeconds -lt $timeoutSec)
    {
        try
        {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 10
            return $response.StatusCode
        }
        catch
        {
            $lastError = $_.Exception.Message
            Start-Sleep -Seconds $retryDelaySec
        }
    }

    throw "Health check failed after $timeoutSec sec for '$url'. Last error: $lastError"
}

$appCmdPath = Resolve-AppCmdPath
Write-Step "Using appcmd: $appCmdPath"

$projectPath = Join-Path $SourceRoot $ProjectRelativePath
if (-not (Test-Path $projectPath))
{
    $scriptRootSource = Split-Path -Parent $PSScriptRoot
    $candidateProjectPath = Join-Path $scriptRootSource $ProjectRelativePath
    if (Test-Path $candidateProjectPath)
    {
        $SourceRoot = $scriptRootSource
        $projectPath = $candidateProjectPath
        Write-Step "Auto-detected SourceRoot from script location: $SourceRoot"
    }
}
if (-not (Test-Path $projectPath))
{
    throw "Project file not found: $projectPath"
}

$resolvedTargetPath = $TargetPath
if ([string]::IsNullOrWhiteSpace($resolvedTargetPath))
{
    $rawVdirPath = Invoke-AppCmd $appCmdPath @("list", "vdir", "$SiteName/", "/text:physicalPath")
    if ([string]::IsNullOrWhiteSpace($rawVdirPath))
    {
        throw "Cannot resolve physical path for IIS site '$SiteName'."
    }

    $resolvedTargetPath = Expand-PathValue $rawVdirPath
}

if (-not (Test-Path $resolvedTargetPath))
{
    throw "IIS target path does not exist: $resolvedTargetPath"
}

$resolvedPool = $AppPool
if ([string]::IsNullOrWhiteSpace($resolvedPool))
{
    $resolvedPool = Invoke-AppCmd $appCmdPath @("list", "app", "$SiteName/", "/text:applicationPool")
    if ([string]::IsNullOrWhiteSpace($resolvedPool))
    {
        throw "Cannot resolve app pool for IIS site '$SiteName'."
    }
}

if ($EnsureLocalhostBinding)
{
    Ensure-LocalhostHttpBinding $appCmdPath $SiteName
}

$publishDir = $PublishOutput
if ([string]::IsNullOrWhiteSpace($publishDir))
{
    $publishDir = Join-Path $env:TEMP "stockchart_publish"
}
$publishDir = Expand-PathValue $publishDir

if (Test-Path $publishDir)
{
    Write-Step "Cleaning publish directory: $publishDir"
    Remove-Item -LiteralPath $publishDir -Recurse -Force
}
New-Item -ItemType Directory -Path $publishDir | Out-Null

$dotnetArgs = @("publish", $projectPath, "-c", $Configuration, "-o", $publishDir, "--nologo")
if ($SkipBuild)
{
    $dotnetArgs += "--no-build"
}

Write-Step "dotnet $($dotnetArgs -join ' ')"
& dotnet @dotnetArgs
if ($LASTEXITCODE -ne 0)
{
    throw "dotnet publish failed with exit code $LASTEXITCODE."
}

$appOfflinePath = Join-Path $resolvedTargetPath "app_offline.htm"

try
{
    Write-Step "Creating app_offline.htm"
    Set-Content -LiteralPath $appOfflinePath -Value "<html><body>Updating site...</body></html>" -Encoding UTF8

    Write-Step "Stopping site: $SiteName"
    Invoke-AppCmd $appCmdPath @("stop", "site", "/site.name:$SiteName") | Out-Null

    Write-Step "Stopping app pool: $resolvedPool"
    Invoke-AppCmd $appCmdPath @("stop", "apppool", "/apppool.name:$resolvedPool") | Out-Null

    $startWait = Get-Date
    while ((Get-AppPoolState $appCmdPath $resolvedPool) -ne "Stopped")
    {
        Start-Sleep -Seconds 1
        if (((Get-Date) - $startWait).TotalSeconds -gt $StopTimeoutSec)
        {
            throw "App pool '$resolvedPool' did not stop within $StopTimeoutSec seconds."
        }
    }

    Write-Step "Copying publish output to IIS folder"
    $roboArgs = @(
        $publishDir,
        $resolvedTargetPath,
        "/MIR",
        "/R:2",
        "/W:2",
        "/NFL",
        "/NDL",
        "/NP"
    )

    if ($ExcludeDirs.Count -gt 0)
    {
        $roboArgs += "/XD"
        $roboArgs += $ExcludeDirs
    }

    & robocopy @roboArgs
    $robocopyCode = $LASTEXITCODE
    if ($robocopyCode -ge 8)
    {
        throw "robocopy failed with exit code $robocopyCode."
    }

    if ($CopyMcpAdapter)
    {
        $mcpSourcePath = Join-Path $SourceRoot $McpAdapterRelativePath
        $mcpTargetPath = Join-Path $resolvedTargetPath $McpAdapterRelativePath

        if (Test-Path $mcpSourcePath)
        {
            Write-Step "Copying MCP adapter: $mcpSourcePath -> $mcpTargetPath"
            New-Item -ItemType Directory -Force -Path $mcpTargetPath | Out-Null

            $mcpRoboArgs = @(
                $mcpSourcePath,
                $mcpTargetPath,
                "/MIR",
                "/R:2",
                "/W:2",
                "/NFL",
                "/NDL",
                "/NP"
            )

            & robocopy @mcpRoboArgs
            $mcpRobocopyCode = $LASTEXITCODE
            if ($mcpRobocopyCode -ge 8)
            {
                throw "MCP adapter robocopy failed with exit code $mcpRobocopyCode."
            }
        }
        else
        {
            Write-Warning "MCP adapter source folder not found: $mcpSourcePath"
        }
    }

    Write-Step "Removing app_offline.htm"
    Remove-Item -LiteralPath $appOfflinePath -Force -ErrorAction SilentlyContinue

    Write-Step "Starting app pool: $resolvedPool"
    Invoke-AppCmd $appCmdPath @("start", "apppool", "/apppool.name:$resolvedPool") | Out-Null

    Write-Step "Starting site: $SiteName"
    Invoke-AppCmd $appCmdPath @("start", "site", "/site.name:$SiteName") | Out-Null

    Write-Step "Health check: $LocalHealthUrl (timeout=$HealthTimeoutSec sec)"
    try
    {
        $statusCode = Wait-Health -url $LocalHealthUrl -timeoutSec $HealthTimeoutSec -retryDelaySec $HealthRetryDelaySec
        Write-Step "Health check status: $statusCode"
    }
    catch
    {
        Write-Warning $_.Exception.Message
    }

    Write-Step "Deploy completed."
}
catch
{
    Write-Error $_
    throw
}
finally
{
    if (Test-Path $appOfflinePath)
    {
        Remove-Item -LiteralPath $appOfflinePath -Force -ErrorAction SilentlyContinue
    }
}
