#!/usr/bin/env bash
# Builds DVoD.app - a real double-clickable/openable macOS app bundle, not just a
# CLI binary. Unsigned/unnotarized (see README.md's honest scope note) - a
# hackathon demo build, so first launch needs right-click > Open to pass Gatekeeper.
set -euo pipefail
cd "$(dirname "$0")"

swift build -c release

APP="DVoD.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp ".build/release/DVoDClient" "$APP/Contents/MacOS/DVoDClient"
cp "Resources/Info.plist" "$APP/Contents/Info.plist"

echo "Built $APP"
echo "Run: open $APP"
echo "Register the dvod:// URL scheme: open $APP once, or run:"
echo "  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f \"$(pwd)/$APP\""
