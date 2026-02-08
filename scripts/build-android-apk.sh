#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-debug}"

if [[ ! -d "android" ]]; then
  echo "❌ Android project not found. Run: npm run mobile:add:android"
  exit 1
fi

if [[ ! -f "android/gradlew" ]]; then
  echo "❌ Gradle wrapper not found at android/gradlew. Re-run: npm run mobile:add:android"
  exit 1
fi

pushd android >/dev/null

case "$MODE" in
  debug)
    ./gradlew assembleDebug
    echo "✅ Debug APK: android/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  release)
    ./gradlew assembleRelease
    echo "✅ Release APK: android/app/build/outputs/apk/release/app-release.apk"
    ;;
  *)
    echo "❌ Unknown mode '$MODE'. Use: debug | release"
    exit 1
    ;;
esac

popd >/dev/null
