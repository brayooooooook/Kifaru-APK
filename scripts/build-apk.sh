#!/usr/bin/env bash
# Build Long Haul Africa Android APK / AAB.
# Requires JDK 17+ and Android SDK. Unity is not used: this is Capacitor + WebGL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export JAVA_HOME="${JAVA_HOME:-$HOME/jdk}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "==> Java: $(java -version 2>&1 | head -1 || echo MISSING)"
if ! command -v java >/dev/null; then
  echo "JDK not found. Install Temurin 17 and set JAVA_HOME."
  exit 1
fi

npm run build

if [ ! -d android ]; then
  npx cap add android
fi
npx cap sync android

# ARM64 only
PROP=android/gradle.properties
grep -q "android.injected.build.abi" "$PROP" 2>/dev/null || echo "android.injected.build.abi=arm64-v8a" >> "$PROP"

cd android
chmod +x gradlew
./gradlew assembleDebug assembleRelease bundleRelease --no-daemon -Dorg.gradle.jvmargs=-Xmx1536m

echo "==> APKs:"
find . -name "*.apk" -o -name "*.aab" | sort
