$ErrorActionPreference = 'Stop'

Write-Host "== Android first APK bootstrap (Windows) =="

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js not found. Install Node.js 20+ and retry."
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  Write-Error "Java not found. Install JDK 17 and retry."
}

Write-Host "Node: $(node -v)"
${javaVersion} = (cmd /c "java -version 2>&1" | Select-Object -First 1)
Write-Host "Java: $javaVersion"

Write-Host ""
Write-Host "1) Checking Capacitor environment"
npm run mobile:doctor

Write-Host ""
Write-Host "2) Ensuring Android platform exists"
if (-not (Test-Path "android")) {
  npm run mobile:add:android
  Write-Host "Android platform added"
} else {
  Write-Host "android/ already exists"
}

Write-Host ""
Write-Host "3) Building web app + syncing native project"
npm run mobile:sync

Write-Host ""
Write-Host "4) Building debug APK"
npm run mobile:apk:debug:win

Write-Host ""
Write-Host "Done. Your APK should be at:"
Write-Host "android/app/build/outputs/apk/debug/app-debug.apk"
