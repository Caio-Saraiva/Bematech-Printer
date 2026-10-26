# Build, test and package

[English](DEVELOPMENT.md) · [Português](../pt-BR/DESENVOLVIMENTO.md)

## Toolchains

| System | Build tools |
| --- | --- |
| Windows | Visual Studio Build Tools with Desktop C/C++, CMake; NSIS for installer |
| Linux | GCC or Clang, CMake 3.20+, Make or Ninja; dpkg tools for DEB |
| macOS | Xcode Command Line Tools, CMake; hdiutil and codesign for DMG |
| Optional checks | Python 3 for integration/checksum scripts; Node for JS syntax checks |

There are no application runtime packages and no fetched C dependencies.
The C library uses the standard library; the native adapter uses OS APIs.

~~~sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
~~~

On Linux/macOS, run ./build/bematech-printer --no-open for terminal-controlled
preview. Visual Studio executables are under build/Release/.

## Tests and validation

The C suite checks exact CP850 bytes, strict UTF-8, embedded ESC refusal,
line wrapping, bitmap dimensions, malformed P4 and preservation of leading
whitespace-valued raster bytes. Tests do not rely on assert(), so Release
optimization does not remove them.

If Python is available at configure time, CTest also starts a simulation
server, checks Host/Origin behavior, exercises valid and invalid print
requests, verifies CLI output and sends a job to a virtual POSIX serial port.
This never discovers or opens the user's real printer.

Browser QA is separate: editor, list, image, drawing, calculator, calibration,
exports, invalid input, EN/PT-BR, 360/768/1280 widths. Documentation captures
show the app, not mockup artwork. When updating web files, rebuild before
testing the executable because assets are embedded at compile time.

## Packaging

~~~sh
# Portable archive; run from repository root
cpack --config build/CPackConfig.cmake -C Release -G ZIP

# Linux Debian
cpack --config build/CPackConfig.cmake -G DEB

# Windows NSIS installer
cpack --config build/CPackConfig.cmake -C Release -G NSIS

# macOS .app and DMG
sh packaging/macos.sh build

# Linux AppImage — obtain appimagetool 1.9.1 from its upstream release
sh packaging/appimage.sh build /absolute/path/to/appimagetool-x86_64.AppImage
~~~

AppImage packaging stages an AppDir with AppRun, desktop entry, icon and
embedded executable. The DEB is built against the build host libc, so avoid
using a newer distribution than your intended deployment baseline.
The AppImage does not bundle glibc.

The macOS package is built separately for Apple silicon and Intel. It receives
an ad-hoc integrity signature only. Distribution notarization requires an Apple
Developer identity and is deliberately not configured with credentials here.
Windows signing likewise requires your own certificate.

## CI and release

.github/workflows/build.yml builds and tests Linux x86-64, Windows x86-64,
macOS arm64 and macOS x86-64. It uploads native archives plus DEB, AppImage,
NSIS and DMG packages, with SHA256SUMS. Branch/PR runs produce artifacts;
version tags produce a preview GitHub Release after every build succeeds.

To cut a new version:

1. Update BP_VERSION, the CMake project version and macOS bundle metadata.
2. Update both release-notes files and regenerate any stale screenshots.
3. Run CTest and browser QA.
4. Commit, create vX.Y.Z and push the tag.
5. Inspect all native jobs and release assets before promoting the release.

A successful compile/package is not physical hardware certification. Test the
exact printer mode on each OS before claiming hardware coverage.

## Extending the app

Keep device bytes in the C engine. UI tools should produce a monochrome bitmap
and use the existing P4 contract rather than introducing arbitrary raw-command
HTTP endpoints. Add exact-byte C tests when adding printer commands. Keep
limits at each boundary and preserve loopback binding.

English strings are the source entries in index.html; PT-BR mappings and
dynamic strings live in app.js. Update both languages and test long labels.

The hosted playground checkout is maintained separately. To refresh it, copy
the approved static assets into the private deployment checkout and retain its
demo-only wrapper. Never copy deployment identity or credentials into this
repository. Public screenshots may be copied into docs/screenshots/.

## Repository hygiene

build*/, dist/, logs, raw jobs, .env*, credentials, Playwright output and
hosting metadata are ignored. Commit only source, documentation and approved
documentation screenshots. Keep the public history independent of the private
Bematech service.
