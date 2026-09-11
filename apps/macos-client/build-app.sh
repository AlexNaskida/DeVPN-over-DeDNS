#!/usr/bin/env bash
# Builds DVoD.app - a real double-clickable/openable macOS app bundle, not just a
# CLI binary. Unsigned/unnotarized (see README.md's honest scope note) - a
# hackathon demo build, so first launch needs right-click > Open to pass Gatekeeper.
#
# Pass --install to also copy it into /Applications and register it with
# Launch Services, so it's Spotlight-searchable like any other installed app.
set -euo pipefail
cd "$(dirname "$0")"

swift build -c release

APP="DVoD.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp ".build/release/DVoDClient" "$APP/Contents/MacOS/DVoDClient"
cp "Resources/Info.plist" "$APP/Contents/Info.plist"
cp Resources/MenuBarIcon*.png "$APP/Contents/Resources/"
cp Resources/DashboardLogo.png "$APP/Contents/Resources/"
cp Resources/DVoD.icns "$APP/Contents/Resources/"

LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"

if [[ "${1:-}" == "--install" ]]; then
    rm -rf "/Applications/$APP"
    cp -R "$APP" "/Applications/$APP"
    "$LSREGISTER" -f "/Applications/$APP"
    echo "Installed to /Applications/$APP - searchable in Spotlight now."
    echo "Run: open -a DVoD"
else
    echo "Built $APP"
    echo "Run: open $APP"
    echo "Register the dvod:// URL scheme: open $APP once, or run:"
    echo "  $LSREGISTER -f \"$(pwd)/$APP\""
    echo "Install into /Applications (Spotlight-searchable): ./build-app.sh --install"
fi
