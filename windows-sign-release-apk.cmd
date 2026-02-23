@echo off
setlocal enabledelayedexpansion

REM Run from repository root. Signs app-release-unsigned.apk using local keystore.
REM Prefer apksigner (v1/v2/v3 signatures). Fallback to jarsigner if SDK tools are unavailable.

set "NO_PAUSE=0"
if /i "%~1"=="--no-pause" set "NO_PAUSE=1"

set "UNSIGNED_APK=android\app\build\outputs\apk\release\app-release-unsigned.apk"
set "ALIGNED_APK=android\app\build\outputs\apk\release\app-release-aligned.apk"
set "SIGNED_APK=android\app\build\outputs\apk\release\app-release-signed.apk"
set "KEYSTORE_PATH=milena-share.keystore"
set "LEGACY_KEYSTORE_PATH=android\keystores\milena-share.keystore"
set "KEY_ALIAS=milena-share"
set "EXIT_CODE=0"

if not exist "%UNSIGNED_APK%" (
  echo.
  echo ERROR: %UNSIGNED_APK% not found.
  echo Build release first with windows-first-time-release.cmd or windows-next-release.cmd.
  set "EXIT_CODE=1"
  goto :finish
)

if not exist "%KEYSTORE_PATH%" if exist "%LEGACY_KEYSTORE_PATH%" (
  echo.
  echo INFO: Migrating legacy key from %LEGACY_KEYSTORE_PATH% to project root...
  copy /y "%LEGACY_KEYSTORE_PATH%" "%KEYSTORE_PATH%" >nul
  if errorlevel 1 (
    echo ERROR: Could not migrate legacy key to project root.
    set "EXIT_CODE=1"
    goto :finish
  )
  if exist ".git" (
    where git >nul 2>&1
    if not errorlevel 1 git add "%KEYSTORE_PATH%" >nul 2>&1
  )
)

if not exist "%KEYSTORE_PATH%" (
  echo.
  echo ERROR: %KEYSTORE_PATH% not found.
  echo Create one first with windows-create-release-key.cmd.
  set "EXIT_CODE=1"
  goto :finish
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
echo Keystore path: %KEYSTORE_PATH%

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

  echo Enter keystore and key passwords when prompted by apksigner.
  if defined JAVA_TOOL_OPTIONS (
    set "JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED !JAVA_TOOL_OPTIONS!"
  ) else (
    set "JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED"
  )

  "%APKSIGNER%" sign --ks "%KEYSTORE_PATH%" --ks-key-alias "%KEY_ALIAS%" --out "%SIGNED_APK%" "!INPUT_APK!"
  if errorlevel 1 goto :fail

  "%APKSIGNER%" verify --verbose "%SIGNED_APK%"
  if errorlevel 1 goto :fail

  goto :success
)

echo.
echo WARNING: apksigner not found in Android SDK. Falling back to jarsigner.
copy /y "%UNSIGNED_APK%" "%SIGNED_APK%" >nul
if errorlevel 1 goto :fail

echo Enter keystore and key passwords when prompted by jarsigner.
jarsigner -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%KEYSTORE_PATH%" "%SIGNED_APK%" "%KEY_ALIAS%"
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
set "EXIT_CODE=0"
goto :finish

:fail
echo.
echo ERROR: APK signing failed.
set "EXIT_CODE=1"

:finish
if "%NO_PAUSE%"=="1" exit /b %EXIT_CODE%
pause
exit /b %EXIT_CODE%
