#!/bin/sh
set -eu
build_dir="${1:-build}"
app="$build_dir/Bematech Printer.app"
mkdir -p "$app/Contents/MacOS"
cp "$build_dir/bematech-printer" "$app/Contents/MacOS/bematech-printer"
cp packaging/Info.plist "$app/Contents/Info.plist"
cp packaging/macos-launcher "$app/Contents/MacOS/launcher"
chmod +x "$app/Contents/MacOS/launcher"
# Ad-hoc integrity signature, not Apple notarization.
codesign --force --deep --sign - "$app"
hdiutil create -volname "Bematech Printer" -srcfolder "$app" -ov -format UDZO "$build_dir/Bematech-Printer-macOS.dmg"
