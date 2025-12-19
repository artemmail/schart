# PowerShell script to check and fix Node.js installation

# Function to check if Node.js is installed
function Check-NodeJsInstallation {
    try {
        $nodeVersion = node -v
        Write-Host "Node.js is installed. Version: $nodeVersion"
    } catch {
        Write-Host "Node.js is not found in the PATH."
        return $false
    }
    return $true
}

# Function to add Node.js to PATH
function Add-NodeJsToPath {
    $nodePath = "C:\Program Files\nodejs"
    if (Test-Path $nodePath) {
        Write-Host "Node.js found at $nodePath"
        [System.Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$nodePath", [System.EnvironmentVariableTarget]::Machine)
        Write-Host "Node.js path added to the system PATH. Please restart your terminal or system."
    } else {
        Write-Host "Node.js installation not found in the default directory. Please reinstall Node.js."
    }
}

# Main script execution
if (-not (Check-NodeJsInstallation)) {
    Add-NodeJsToPath
    # Check again after trying to fix the PATH
    Check-NodeJsInstallation
}
