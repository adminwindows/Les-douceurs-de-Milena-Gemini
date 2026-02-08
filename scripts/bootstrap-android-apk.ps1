$ErrorActionPreference = 'Stop'

function Invoke-NpmStep {
  param([string]$Command)
  & cmd /c $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command"
  }
}

function Test-AndroidProjectValid {
  return (Test-Path "android/gradlew.bat") -and (Test-Path "android/app/src/main/AndroidManifest.xml")
}

Write-Host "== Android first APK bootstrap (Windows) =="

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js not found. Install Node.js 22+ and retry."
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  Write-Error "Java not found. Install JDK 17 and retry."
}

Write-Host "Node: $(node -v)"
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 22) {
  throw "Node.js 22+ is required (current: $(node -v))."
}

$javaVersion = (cmd /c "java -version 2>&1" | Select-Object -First 1)
Write-Host "Java: $javaVersion"

Write-Host ""
Write-Host "1) Ensuring Android platform exists"
if (-not (Test-Path "android")) {
  Invoke-NpmStep "npm run mobile:add:android"
  Write-Host "Android platform added"
} elseif (-not (Test-AndroidProjectValid)) {
  Write-Host "android/ exists but is incomplete. Recreating it..."
  Remove-Item -Path "android" -Recurse -Force
  Invoke-NpmStep "npm run mobile:add:android"
  Write-Host "Android platform re-created"
} else {
  Write-Host "android/ already exists and looks valid"
}

Write-Host ""
Write-Host "2) Checking Capacitor environment"
Invoke-NpmStep "npm run mobile:doctor"

Write-Host ""
Write-Host "3) Building web app + syncing native project"
Invoke-NpmStep "npm run mobile:sync"

if (-not (Test-AndroidProjectValid)) {
  throw "Android project is still incomplete after sync (missing gradlew.bat or AndroidManifest.xml)."
}

Write-Host ""
Write-Host "4) Building debug APK"
Invoke-NpmStep "npm run mobile:apk:debug:win"

Write-Host ""
Write-Host "Done. Your APK should be at:"
Write-Host "android/app/build/outputs/apk/debug/app-debug.apk"
