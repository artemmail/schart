param(
    [string]$SourceRoot = "C:\corechart",
    [string]$ProjectRelativePath = "StockChart\StockChart.csproj",
    [string]$SiteName = "stockchart",
    [string]$AppPool = "",
    [string]$TargetPath = "",
    [string]$Configuration = "Release",
    [string]$PublishOutput = "",
    [string]$LocalHealthUrl = "http://localhost:5253/",
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

function Ensure-LocalhostHttpBinding([string]$appCmdPath, [string]$siteName)
{
    $bindings = Invoke-AppCmd $appCmdPath @("list", "site", $siteName, "/text:bindings")
    if ($bindings -match "http/127\.0\.0\.1:5253:")
    {
        Write-Step "localhost binding already exists: http/127.0.0.1:5253"
        return
    }

    Write-Step "Adding localhost binding: http/127.0.0.1:5253"
    Invoke-AppCmd $appCmdPath @(
        "set",
        "site",
        "/site.name:$siteName",
        "/+bindings.[protocol='http',bindingInformation='127.0.0.1:5253:']"
    ) | Out-Null
}

$appCmdPath = Resolve-AppCmdPath
Write-Step "Using appcmd: $appCmdPath"

$projectPath = Join-Path $SourceRoot $ProjectRelativePath
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

    Write-Step "Removing app_offline.htm"
    Remove-Item -LiteralPath $appOfflinePath -Force -ErrorAction SilentlyContinue

    Write-Step "Starting app pool: $resolvedPool"
    Invoke-AppCmd $appCmdPath @("start", "apppool", "/apppool.name:$resolvedPool") | Out-Null

    Write-Step "Starting site: $SiteName"
    Invoke-AppCmd $appCmdPath @("start", "site", "/site.name:$SiteName") | Out-Null

    Write-Step "Health check: $LocalHealthUrl"
    try
    {
        $response = Invoke-WebRequest -Uri $LocalHealthUrl -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 20
        Write-Step "Health check status: $($response.StatusCode)"
    }
    catch
    {
        Write-Warning "Health check failed: $($_.Exception.Message)"
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
