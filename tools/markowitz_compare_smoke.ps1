param(
    [string]$BaseUrl = "http://localhost:5253",
    [string]$StartDate = "2025-01-01",
    [string]$EndDate = "2026-01-01",
    [double[]]$Risks = @(0.05, 0.1, 0.2),
    [double]$ActualTolerance = 0.001,
    [double]$StdDevTolerance = 3.0,
    [double]$WeightTolerance = 20.0
)

$ErrorActionPreference = "Stop"

$cases = @(
    @{ Name = "banks5"; Tickers = "SBER,VTBR,BSPB,CBOM,SVCB" },
    @{ Name = "energy5"; Tickers = "GAZP,ROSN,LKOH,SIBN,NVTK" },
    @{ Name = "mix10"; Tickers = "SBER,VTBR,BSPB,CBOM,SVCB,GAZP,ROSN,LKOH,NVTK,TATN" }
)

$rows = @()
$failed = $false
$ci = [System.Globalization.CultureInfo]::InvariantCulture

foreach ($case in $cases) {
    foreach ($risk in $Risks) {
        $riskStr = [string]::Format($ci, "{0:0.####}", $risk)
        $url = "$BaseUrl/api/Portfolio/MarkovitzMcpCompare?tickers=$([System.Net.WebUtility]::UrlEncode($case.Tickers))&startDate=$StartDate&endDate=$EndDate&risk=$riskStr"
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop
            $sw.Stop()
        }
        catch {
            $sw.Stop()
            $failed = $true
            $rows += [pscustomobject]@{
                case = $case.Name
                risk = $riskStr
                status = "ERROR"
                ms = [math]::Round($sw.Elapsed.TotalMilliseconds, 1)
                comparable = $false
                actualDelta = $null
                stddevDelta = $null
                maxWeightDelta = $null
                passed = $false
            }
            continue
        }

        if ([int]$res.StatusCode -ne 200) {
            $failed = $true
            $rows += [pscustomobject]@{
                case = $case.Name
                risk = $riskStr
                status = [int]$res.StatusCode
                ms = [math]::Round($sw.Elapsed.TotalMilliseconds, 1)
                comparable = $false
                actualDelta = $null
                stddevDelta = $null
                maxWeightDelta = $null
                passed = $false
            }
            continue
        }

        $json = $res.Content | ConvertFrom-Json
        $actualDelta = [double]$json.actualDeltaAbs
        $stddevDelta = [double]$json.stddevDeltaAbs
        $maxWeightDelta = [double]$json.maxWeightDeltaAbs
        $comparable = [bool]$json.comparable

        $passed = $comparable `
            -and ($actualDelta -le $ActualTolerance) `
            -and ($stddevDelta -le $StdDevTolerance) `
            -and ($maxWeightDelta -le $WeightTolerance)

        if (-not $passed) {
            $failed = $true
        }

        $rows += [pscustomobject]@{
            case = $case.Name
            risk = $riskStr
            status = [int]$res.StatusCode
            ms = [math]::Round($sw.Elapsed.TotalMilliseconds, 1)
            comparable = $comparable
            actualDelta = [math]::Round($actualDelta, 8)
            stddevDelta = [math]::Round($stddevDelta, 6)
            maxWeightDelta = [math]::Round($maxWeightDelta, 4)
            passed = $passed
        }
    }
}

$rows | Format-Table -AutoSize | Out-Host

if ($failed) {
    Write-Host "Markowitz compare smoke FAILED"
    exit 1
}

Write-Host "Markowitz compare smoke PASSED"
exit 0
