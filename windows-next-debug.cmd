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

echo [1/7] Installing dependencies (safe if already installed)...
call npm install || goto :fail

echo [2/7] Running tests...
if defined TEST_NODE_OPTIONS (
  set "NODE_OPTIONS=!TEST_NODE_OPTIONS!"
  echo [node] Node !NODE_MAJOR! detected. Running tests with !TEST_NODE_OPTIONS!.
)
call npm run test || goto :fail
set "NODE_OPTIONS="

echo [3/7] Running typecheck...
call npm run typecheck || goto :fail

echo [4/7] Building web app...
call npm run build || goto :fail

echo [5/7] Applying app logo to Android launcher icons...
call npm run mobile:icons:android || goto :fail

echo [6/7] Syncing web to Android...
call npm run mobile:sync || goto :fail

echo [7/7] Building DEBUG APK...
call npm run mobile:apk:debug:win || goto :fail

dir /s /b android\app\build\outputs\apk\*.apk

echo.
echo SUCCESS: Next-iteration DEBUG build completed.
pause
exit /b 0

:fail
echo.
echo ERROR: Build failed.
pause
exit /b 1
