#!/bin/sh
set -eu
# Usage: packaging/appimage.sh build /absolute/path/to/appimagetool
build_dir="${1:-build}"
appimage_tool="${2:?Provide the appimagetool executable path}"
app_dir="$PWD/$build_dir/BematechPrinter.AppDir"
mkdir -p "$app_dir/usr/bin"
cp "$build_dir/bematech-printer" "$app_dir/usr/bin/"
cp packaging/bematech-printer.desktop "$app_dir/"
cp web/favicon.svg "$app_dir/bematech-printer.svg"
cp packaging/AppRun "$app_dir/AppRun"
chmod +x "$app_dir/AppRun"
ARCH=x86_64 APPIMAGE_EXTRACT_AND_RUN=1 "$appimage_tool" "$app_dir" "$build_dir/Bematech-Printer-x86_64.AppImage"
