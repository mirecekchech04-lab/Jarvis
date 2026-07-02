# Creates a J.A.R.V.I.S. desktop shortcut on Windows.
# Usage (PowerShell):  powershell -ExecutionPolicy Bypass -File scripts\install-shortcut.ps1
#   or just double-click scripts\install-shortcut.bat

$ErrorActionPreference = "Stop"

# Repo root = parent of this script's folder.
$Root = Split-Path -Parent $PSScriptRoot
$Target = Join-Path $Root "launch.bat"
$Desktop = [Environment]::GetFolderPath("Desktop")
$LinkPath = Join-Path $Desktop "J.A.R.V.I.S..lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($LinkPath)
$shortcut.TargetPath = $Target
$shortcut.WorkingDirectory = $Root
$shortcut.Description = "Voice-driven personal AI assistant with a Tony Stark HUD"
$shortcut.WindowStyle = 1

# Use the app icon if a .ico is present, otherwise fall back to the launcher.
$ico = Join-Path $Root "assets\jarvis.ico"
if (Test-Path $ico) {
    $shortcut.IconLocation = $ico
} else {
    $shortcut.IconLocation = "$Target,0"
}

$shortcut.Save()

Write-Host "Created desktop shortcut: $LinkPath"
Write-Host "Double-click 'J.A.R.V.I.S.' on your Desktop to launch."
