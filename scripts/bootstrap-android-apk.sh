#!/usr/bin/env bash
set -euo pipefail

echo "== Android first APK bootstrap =="

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found. Install Node.js 22+ and retry."
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "❌ Java not found. Install JDK 17 and retry."
  exit 1
fi

echo "✅ Node: $(node -v)"
node_major=$(node -p "process.versions.node.split('.')[0]")
if [[ "$node_major" -lt 22 ]]; then
  echo "❌ Node.js 22+ is required (current: $(node -v))"
  exit 1
fi
echo "✅ Java: $(java -version 2>&1 | head -n 1)"

is_android_valid() {
  [[ -f "android/gradlew" && -f "android/app/src/main/AndroidManifest.xml" ]]
}

ensure_android_project() {
  if [[ ! -d "android" ]]; then
    npm run mobile:add:android
    echo "✅ Android platform added"
  elif ! is_android_valid; then
    echo "⚠️ android/ exists but is incomplete. Recreating..."
    rm -rf android
    npm run mobile:add:android
    echo "✅ Android platform re-created"
  else
    echo "✅ android/ already exists and looks valid"
  fi
}

echo
echo "1) Ensuring Android platform exists"
ensure_android_project

echo
echo "2) Checking Capacitor environment"
set +e
doctor_output=$(npm run mobile:doctor 2>&1)
doctor_code=$?
set -e
echo "$doctor_output"
if [[ $doctor_code -ne 0 ]]; then
  if [[ "$doctor_output" == *"gradlew file is missing"* || "$doctor_output" == *"AndroidManifest.xml is missing"* ]]; then
    echo "⚠️ Detected incomplete Android project during doctor check. Recreating android/ and retrying..."
    ensure_android_project
    npm run mobile:doctor
  else
    echo "❌ npm run mobile:doctor failed"
    exit $doctor_code
  fi
fi

echo
echo "3) Building web app + syncing native project"
npm run mobile:sync

if ! is_android_valid; then
  echo "❌ Android project is still incomplete after sync (missing gradlew or AndroidManifest.xml)."
  exit 1
fi

echo
echo "4) Building debug APK"
npm run mobile:apk:debug

echo
echo "✅ Done. Your APK should be at:"
echo "android/app/build/outputs/apk/debug/app-debug.apk"
