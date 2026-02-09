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
    }
    'release' {
      ./gradlew.bat assembleRelease
    }
  }
}
finally {
  Pop-Location
}

$apkOutputDir = "android/app/build/outputs/apk/$Mode"
$apkCandidates = Get-ChildItem -Path $apkOutputDir -Filter "*.apk" -Recurse -ErrorAction SilentlyContinue

if (-not $apkCandidates -or $apkCandidates.Count -eq 0) {
  throw "Build finished but no APK was found under $apkOutputDir"
}

Write-Host "$Mode build APK(s):"
$apkCandidates |
  Sort-Object FullName |
  ForEach-Object {
    $relative = Resolve-Path -Path $_.FullName -Relative
    Write-Host "- Relative: $relative"
    Write-Host "  Absolute: $($_.FullName)"
  }
