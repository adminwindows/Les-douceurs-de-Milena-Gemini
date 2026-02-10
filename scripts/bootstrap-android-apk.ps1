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

function Ensure-AndroidProject {
  if (-not (Test-Path "android")) {
    Invoke-NpmStep "npm run mobile:add:android"
    Write-Host "Android platform added"
    return
  }

  if (-not (Test-AndroidProjectValid)) {
    Write-Host "android/ exists but is incomplete. Recreating it..."
    Remove-Item -Path "android" -Recurse -Force
    Invoke-NpmStep "npm run mobile:add:android"
    Write-Host "Android platform re-created"
    return
  }

  Write-Host "android/ already exists and looks valid"
}

function Resolve-AndroidSdkPath {
  if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    return $env:ANDROID_HOME
  }
  if ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) {
    return $env:ANDROID_SDK_ROOT
  }

  $candidates = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  return $null
}

function Ensure-AndroidLocalProperties {
  $sdkPath = Resolve-AndroidSdkPath
  if (-not $sdkPath) {
    throw "Android SDK not found. Set ANDROID_HOME/ANDROID_SDK_ROOT or create android/local.properties with sdk.dir=..."
  }

  $escaped = $sdkPath.Replace('\', '\\')
  $content = "sdk.dir=$escaped`n"
  Set-Content -Path "android/local.properties" -Value $content -Encoding ASCII
  Write-Host "Configured android/local.properties with sdk.dir=$sdkPath"
}

Write-Host "== Android first APK bootstrap (Windows) =="

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js not found. Install Node.js 22+ and retry."
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  Write-Error "Java not found. Install JDK 21 and retry."
}

Write-Host "Node: $(node -v)"
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 22) {
  throw "Node.js 22+ is required (current: $(node -v))."
}

$javaVersion = (cmd /c "java -version 2>&1" | Select-Object -First 1)
Write-Host "Java: $javaVersion"
$javaMajor = [int](cmd /c "java -XshowSettings:properties -version 2>&1" | Select-String "java.specification.version" | ForEach-Object { ($_ -split "=")[1].Trim() } | Select-Object -First 1)
if ($javaMajor -lt 21) {
  throw "JDK 21+ is required (current major: $javaMajor)."
}

Write-Host ""
Write-Host "1) Ensuring Android platform exists"
Ensure-AndroidProject

Write-Host ""
Write-Host "2) Checking Capacitor environment"
$doctorOutput = & cmd /c "npm run mobile:doctor 2>&1"
$doctorOutput | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) {
  $doctorText = ($doctorOutput -join "`n")
  if ($doctorText -match "gradlew file is missing" -or $doctorText -match "AndroidManifest.xml is missing") {
    Write-Host "Detected incomplete Android project during doctor check. Recreating android/ and retrying..."
    Ensure-AndroidProject
    Invoke-NpmStep "npm run mobile:doctor"
  } else {
    throw "Command failed with exit code ${LASTEXITCODE}: npm run mobile:doctor"
  }
}

Write-Host ""
Write-Host "3) Building web app + syncing native project"
Invoke-NpmStep "npm run mobile:sync"

if (-not (Test-AndroidProjectValid)) {
  throw "Android project is still incomplete after sync (missing gradlew.bat or AndroidManifest.xml)."
}

Write-Host ""
Write-Host "4) Configuring Android SDK path"
Ensure-AndroidLocalProperties

Write-Host ""
Write-Host "5) Building debug APK"
Invoke-NpmStep "npm run mobile:apk:debug:win"

Write-Host ""
$apkCandidates = Get-ChildItem -Path "android/app/build/outputs/apk" -Filter "*.apk" -Recurse -ErrorAction SilentlyContinue
if (-not $apkCandidates -or $apkCandidates.Count -eq 0) {
  throw "Build reported success but no APK was found under android/app/build/outputs/apk"
}

$latestApk = $apkCandidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$fullPath = $latestApk.FullName
$relativePath = Resolve-Path -Path $fullPath -Relative
Write-Host "Done. APK created:"
Write-Host "- Relative: $relativePath"
Write-Host "- Absolute: $fullPath"
