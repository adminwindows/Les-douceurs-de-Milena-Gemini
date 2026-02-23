@echo off
setlocal enableextensions enabledelayedexpansion
set "NODE_OPTIONS="
set "npm_config_node_options="
set "NPM_CONFIG_NODE_OPTIONS="
set "TEST_NODE_OPTIONS="
for /f "tokens=1 delims=." %%n in ('node -v') do set "NODE_MAJOR=%%n"
set "NODE_MAJOR=!NODE_MAJOR:v=!"
if defined NODE_MAJOR if !NODE_MAJOR! GEQ 25 (
  set "TEST_NODE_OPTIONS=--no-webstorage"
)

REM Run from repository root.
for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do set "JAVA_VERSION_RAW=%%v"
set "JAVA_VERSION=%JAVA_VERSION_RAW:"=%"
for /f "tokens=1 delims=." %%m in ("%JAVA_VERSION%") do set "JAVA_MAJOR=%%m"
if not defined JAVA_MAJOR (
  echo [java] ERROR: Unable to detect Java version.
  goto :fail
)
if !JAVA_MAJOR! LSS 21 (
  echo [java] ERROR: Java !JAVA_MAJOR! detected. Android build requires Java 21+.
  goto :fail
)
if defined JAVA_MAJOR if !JAVA_MAJOR! GEQ 25 (
  if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    set "PATH=!JAVA_HOME!\bin;!PATH!"
    echo [java] Java !JAVA_MAJOR! detected. Using Android Studio JBR at "!JAVA_HOME!".
  ) else (
    echo [java] ERROR: Java !JAVA_MAJOR! detected but current Android Gradle stack expects Java 21-24.
    echo [java] Install Android Studio ^(JBR^) or switch JAVA_HOME to a compatible JDK, then retry.
    goto :fail
  )
)

echo [1/10] Removing previous install artifacts...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist

if exist android (
  if exist android\gradlew.bat (
    pushd android
    call gradlew.bat --stop >nul 2>&1
    popd
  )
  rmdir /s /q android
  if exist android (
    timeout /t 2 /nobreak >nul
    rmdir /s /q android
  )
  if exist android (
    echo.
    echo ERROR: Could not remove android\ because some files are locked by another process.
    echo Close Android Studio/Gradle/Java processes and run again.
    pause
    exit /b 1
  )
)

if exist ios rmdir /s /q ios
if exist package-lock.json del /f /q package-lock.json

echo [2/10] Installing dependencies...
call npm install || goto :fail

echo [3/10] Running tests...
if defined TEST_NODE_OPTIONS (
  set "NODE_OPTIONS=!TEST_NODE_OPTIONS!"
  echo [node] Node !NODE_MAJOR! detected. Running tests with !TEST_NODE_OPTIONS!.
)
call npm run test || goto :fail
set "NODE_OPTIONS="

echo [4/10] Running typecheck...
call npm run typecheck || goto :fail

echo [5/10] Building web app...
call npm run build || goto :fail

echo [6/10] Creating Android project...
call npm run mobile:add:android || goto :fail

echo [7/10] Applying app logo to Android launcher icons...
call npm run mobile:icons:android || goto :fail

echo [8/10] Syncing native project...
call npm run mobile:sync || goto :fail

echo [9/10] Building DEBUG APK...
call npm run mobile:apk:debug:win || goto :fail

echo [10/10] APK outputs:
dir /s /b android\app\build\outputs\apk\*.apk

echo.
echo SUCCESS: First-time DEBUG build completed.
pause
exit /b 0

:fail
echo.
echo ERROR: Build failed at step above.
pause
exit /b 1
