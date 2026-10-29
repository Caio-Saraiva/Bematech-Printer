# Build, test, package and maintain

[English](DEVELOPMENT.md) · [Português](../pt-BR/DESENVOLVIMENTO.md)

## Build requirements

C99 compiler, CMake 3.20+ and Make/Ninja (or Visual Studio).
cJSON and PDF.js are vendored at fixed versions; application use does not need
Python, Node, npm, pip or a build-time network fetch.

| Platform | Tools |
| --- | --- |
| Windows | Visual Studio Desktop C/C++, CMake; NSIS for installer |
| Linux | GCC/Clang, CMake, Make/Ninja; dpkg for DEB |
| macOS | Xcode Command Line Tools, CMake; hdiutil/codesign for DMG |

Python 3 is optional for integration/fixture/checksum scripts. Node can validate
JavaScript syntax. Poppler and LibreOffice are optional native document helpers.

~~~sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
./build/bematech-printer --no-open --config /tmp/bematech-dev/settings.json
~~~

Visual Studio uses build/Release/bematech-printer.exe. The web assets are
embedded during compilation: rebuild and restart after changing web/.

## Tests

Core C tests check exact CP850 bytes, unsupported Unicode, invalid UTF-8,
control-command injection, wrapping, bitmap bounds and strict P4 parsing.
Checks remain active in Release.

The optional Python integration suite launches a simulation server using a
temporary profile. It checks settings, device/connection validation, history,
CSV formula safety, calibration, diagnostics, CLI output and C styled text.
POSIX tests capture actual bytes through a virtual serial master; no physical
printer is discovered or opened for output. PDF and Office checks run when
the matching helpers are installed.

Generate original browser fixtures:

~~~sh
python3 tests/make_fixtures.py
~~~

This writes test PDF/DOCX/OBJ under ignored output/fixtures/. The repository
also includes cube.obj, a text file and a vector photo test pattern.

Browser validation must cover the original eight tabs (editor, list, file,
photo, drawing, calculator, computer, model), two languages and widths
360/768/1280. Test visible preview after transitions from photo/model, rich
styles, file numbering/blank lines, PDF/Office import, drawing history,
calculator customer/history/CSV, model materials/pose/printing and connection
save/test. An HTTP success alone does not prove a rendered preview is visible.

Compare web ESC export with native C encoding for a bitmap fixture. Inspect
every documentation screenshot and never use a mockup as implementation proof.

## Preserving the original UI

The original Windows 98 CSS and utility files are the design baseline.
Keep bevels, compact controls, blue title bars, gray workspace and physical paper.
Add platform controls separately; do not replace utility modules with smaller
reimplementations. The 3D viewer must keep its original format/material/camera
surface. See FEATURE_PARITY.md before removing or limiting any behavior.

English is the default interface; PT-BR remains available. Translation operates
on UI text/attributes, preserving control values and user-authored content.
Add dictionary entries and check long labels in both languages.

## Packaging

~~~sh
cpack --config build/CPackConfig.cmake -C Release -G ZIP
cpack --config build/CPackConfig.cmake -G DEB
cpack --config build/CPackConfig.cmake -C Release -G NSIS
sh packaging/macos.sh build
sh packaging/appimage.sh build /absolute/path/to/appimagetool-x86_64.AppImage
~~~

Windows uses a static MSVC runtime. AppImage stages AppRun, desktop entry, icon
and the embedded executable; it does not bundle glibc or Office helpers.
Build Linux packages against a suitable older distribution baseline.
macOS is built separately for Intel and Apple silicon, then ad-hoc signed.
Public Windows signing and Apple notarization need identities not stored here.

Include application/third-party license notices in distributions. Poppler and
LibreOffice remain optional OS installations; do not silently bundle unrelated
machine environments or private configuration.

## CI and release

The workflow builds/tests/packages Linux x86-64, Windows x86-64, macOS arm64 and
macOS x86-64. Branch/PR runs produce artifacts; version tags create a preview
release after all native jobs pass. Release-wide SHA256SUMS uses final download
filenames.

Update BP_VERSION, CMake version and macOS bundle version together. Update
English/PT-BR release notes, screenshots and parity documentation. Test native
and browser paths, commit, create vX.Y.Z and push it. Inspect downloadable
packages and their hashes before handoff.

## Hosted demo boundary

The self-hosted demo uses `tools/serve_demo.py` and the user service in
`packaging/bematech-demo.service`. It serves a temporary static snapshot of
`web/` on `127.0.0.1:8422`, forcing the demo-only flag before application
scripts load. Verify it makes no /api/ requests or hardware calls.
Cloudflare Tunnel routes the public hostname to this loopback service;
credentials and account configuration stay outside this repository.
Do not reuse the private production service.
Browser PDF/Office compatibility differs from native helpers as documented.

## Repository hygiene

Do not commit profiles, quotes, user images/models, credentials, helper output,
builds or browser test output. Approved screenshots live in docs/screenshots/.
Keep temporary profiles outside the checkout, or use ignored paths.
