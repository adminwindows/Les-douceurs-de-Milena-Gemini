@echo off
setlocal enabledelayedexpansion

REM Run from repository root. Signs app-release-unsigned.apk using local keystore.
REM Prefer apksigner (v1/v2/v3 signatures). Fallback to jarsigner if SDK tools are unavailable.

set "UNSIGNED_APK=android\app\build\outputs\apk\release\app-release-unsigned.apk"
set "ALIGNED_APK=android\app\build\outputs\apk\release\app-release-aligned.apk"
set "SIGNED_APK=android\app\build\outputs\apk\release\app-release-signed.apk"
set "KEYSTORE_PATH=android\keystores\milena-share.keystore"
set "KEY_ALIAS=milena-share"

if not exist "%UNSIGNED_APK%" (
  echo.
  echo ERROR: %UNSIGNED_APK% not found.
  echo Build release first with windows-first-time-release.cmd or windows-next-release.cmd.
  pause
  exit /b 1
)

if not exist "%KEYSTORE_PATH%" (
  echo.
  echo ERROR: %KEYSTORE_PATH% not found.
  echo Create one first with windows-create-release-key.cmd.
  pause
  exit /b 1
)

set "SDK_ROOT="
if defined ANDROID_SDK_ROOT set "SDK_ROOT=%ANDROID_SDK_ROOT%"
if not defined SDK_ROOT if defined ANDROID_HOME set "SDK_ROOT=%ANDROID_HOME%"
if not defined SDK_ROOT if exist "%LocalAppData%\Android\Sdk" set "SDK_ROOT=%LocalAppData%\Android\Sdk"

set "APKSIGNER="
set "ZIPALIGN="
if defined SDK_ROOT (
  for /f "delims=" %%D in ('dir /b /ad /o-n "%SDK_ROOT%\build-tools" 2^>nul') do (
    if not defined APKSIGNER if exist "%SDK_ROOT%\build-tools\%%D\apksigner.bat" set "APKSIGNER=%SDK_ROOT%\build-tools\%%D\apksigner.bat"
    if not defined ZIPALIGN if exist "%SDK_ROOT%\build-tools\%%D\zipalign.exe" set "ZIPALIGN=%SDK_ROOT%\build-tools\%%D\zipalign.exe"
  )
)

echo.
echo Enter keystore password for %KEYSTORE_PATH%
set /p STOREPASS=Keystore password: 
if "%STOREPASS%"=="" (
  echo ERROR: Empty password.
  pause
  exit /b 1
)

set /p KEYPASS=Key password ^(press Enter to reuse keystore password^): 
if "%KEYPASS%"=="" set "KEYPASS=%STOREPASS%"

if defined APKSIGNER (
  echo.
  echo INFO: Using apksigner for modern Android signatures.

  if defined ZIPALIGN (
    "%ZIPALIGN%" -p -f 4 "%UNSIGNED_APK%" "%ALIGNED_APK%"
    if errorlevel 1 goto :fail
    set "INPUT_APK=%ALIGNED_APK%"
  ) else (
    echo WARNING: zipalign not found. Continuing with unsigned APK as input.
    set "INPUT_APK=%UNSIGNED_APK%"
  )

  set "JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED %JAVA_TOOL_OPTIONS%"

  "%APKSIGNER%" sign --ks "%KEYSTORE_PATH%" --ks-key-alias "%KEY_ALIAS%" --ks-pass pass:%STOREPASS% --key-pass pass:%KEYPASS% --out "%SIGNED_APK%" "!INPUT_APK!"
  if errorlevel 1 goto :fail

  "%APKSIGNER%" verify --verbose "%SIGNED_APK%"
  if errorlevel 1 goto :fail

  goto :success
)

echo.
echo WARNING: apksigner not found in Android SDK. Falling back to jarsigner.
copy /y "%UNSIGNED_APK%" "%SIGNED_APK%" >nul
if errorlevel 1 goto :fail

jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%KEYSTORE_PATH%" -storepass "%STOREPASS%" -keypass "%KEYPASS%" "%SIGNED_APK%" "%KEY_ALIAS%"
if errorlevel 1 goto :fail

jarsigner -verify -verbose -certs "%SIGNED_APK%" >nul
if errorlevel 1 goto :fail

:success
echo.
echo SUCCESS: Signed APK created:
echo %SIGNED_APK%
echo.
echo If installation still says "Application non installee", uninstall the debug/old Milena app first,
echo then install this signed release APK again (different signing keys cannot upgrade each other).
pause
exit /b 0

:fail
echo.
echo ERROR: APK signing failed.
pause
exit /b 1
