param(
  [ValidateSet('debug', 'release')]
  [string]$Mode = 'debug'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path "android")) {
  Write-Error "Android project not found. Run: npm run mobile:add:android"
}

if (-not (Test-Path "android/gradlew.bat")) {
  Write-Error "Gradle wrapper not found at android/gradlew.bat. Re-run: npm run mobile:add:android"
}

Push-Location android
try {
  switch ($Mode) {
    'debug' {
      ./gradlew.bat assembleDebug
      Write-Host "Debug APK: android/app/build/outputs/apk/debug/app-debug.apk"
    }
    'release' {
      ./gradlew.bat assembleRelease
      Write-Host "Release APK: android/app/build/outputs/apk/release/app-release.apk"
    }
  }
}
finally {
  Pop-Location
}
