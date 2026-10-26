# Native architecture, modules, settings and API

[English](TECHNICAL.md) · [Português](../pt-BR/TECNICO.md)

## Architecture

~~~text
Original Windows 98 HTML/CSS/JS
   ├─ rich editor/list/file/quote/report → normalized styled lines
   ├─ photo/drawing/model/PDF raster → monochrome bitmap
   └─ settings/connection/history → JSON
                         ↓ loopback HTTP
C app state + validation + persistent local profile
   ├─ CP850 styled ESC/Bema text, or Unicode bitmap fallback
   ├─ PBM / 1-bit pixels → ESC-star graphic bands
   └─ Serial / USB printer class / installed RAW queue
~~~

The shared browser UI retains the original utility algorithms. The backend and
device access are C99. There is no Python runtime, authentication/session layer,
credential database or private server tunnel.

The hosted demo has no native process or physical transport. Its wrapper disables
native discovery, and the bridge uses browser-local data and simulated jobs.

## Every module

| Module | Responsibility |
| --- | --- |
| include/bematech.h | Public C buffers, options, CP850/text/bitmap/PBM encoding and server entry |
| include/native.h | Internal C app state, JSON response, transport, conversion and diagnostics interfaces |
| src/bematech.c | Bounded buffers, UTF-8 validation, CP850 encoding, text wrapping and vertical ESC-star bands |
| src/app.c | Local profile, settings validation, connection/history/catalog/quotes API, styled text, calibration, job metadata, base64 and CSV |
| src/server.c | IPv4 loopback HTTP, Host/Origin boundary, explicit embedded assets and synchronous request dispatch |
| src/device.c | Device enumeration, serial settings, Win32 RAW spooler, POSIX USB device and CUPS queue |
| src/process.c | Native helper process execution, argument quoting, output redirection and timeout |
| src/documents.c | Temporary PDF/Office conversion, page limits, PGM reading/cropping/resizing/thresholding and cleanup |
| src/diagnostic.c | Windows/Linux/macOS CPU, memory, uptime, system and disk sampling |
| src/main.c | CLI commands, overrides, file read/export and launch |
| third_party/cjson/ | Pinned cJSON 1.7.19 parser, MIT |
| cmake/EmbedWeb.cmake | Embeds UI assets, modules and PDF.js in generated C arrays |
| web/app.js | Original common state, text/photo processing and base UI handlers |
| web/patch.js | Original calibration ranges/manual entry and settings |
| web/utilities.js | Original richer list/file actions, diagnostics and RAW tool |
| web/editor-v2.js | Original rich style/column preview, physical paper, split divider and zoom |
| web/photo-file-v2.js | Original imports, multi-page behavior, auto adjustment and presets |
| web/draw-v1.js | Original drawing engine: brush/shade/fill/selection/history |
| web/calculator-3d.js | Original full costing, receipt variants, printer/history UI |
| web/model-3d.js | Original unchanged parsers, mesh normalization, projection, shading/materials, gizmo and thermal output |
| web/server-diagnostic.js | Original printable report UI, adapted to local computer |
| web/local-bridge.js | Native API adapter, normalized rich lines, bitmap fallback, isolated demo storage and export |
| web/local-documents.js | Demo/browser PDF.js and modern Office extraction |
| web/local-settings.js | Local connection dialog, bootstrap and export controls |
| web/i18n.js | English-first and PT-BR text without changing original layout |
| web/styles.css, design.css | Original Windows 98 theme |
| web/*-v2.css, draw-v1.css, calculator-3d.css, model-3d.css | Original utility/paper layout |
| web/local-settings.css | Additive connection/language/responsive adjustments |
| web/pdf*.mjs | Self-hosted PDF.js and worker, Apache-2.0 |
| tests/ | Core, process/API/virtual-serial and generated document/model fixtures |
| packaging/ | Desktop entry, AppImage and macOS launch/bundle resources |
| tools/checksums.py | Build-time package SHA-256 manifest |

## Local profile

Default location:

| OS | File |
| --- | --- |
| Windows | %APPDATA%/Bematech-Printer/settings.json |
| macOS | ~/Library/Application Support/Bematech-Printer/settings.json |
| Linux | $XDG_CONFIG_HOME/bematech-printer/settings.json, or ~/.config/bematech-printer/settings.json |

--config selects another file. The profile contains settings, connection,
custom printers, the latest 100 quotes, the latest 100 job metadata records and
an ID counter. It does not store uploaded photos/models or editor documents.
Recent-jobs API returns the last 20 records.

Writes use a temporary file and replacement; POSIX directories/files use private
permissions. Invalid existing files are not silently overwritten. Back up this
profile to preserve local history. Browser/demo storage is separate and belongs
to the site's origin.

## Every printer setting

| Key | Default | Range / meaning |
| --- | ---: | --- |
| cols_a | 48 | 20–80 normal columns |
| cols_b | 64 | 30–120 condensed columns |
| dots | 576 | 320–832 usable print-head pixels |
| image_width | 576 | 8..dots default photo width |
| line_spacing | 17 | 1–60 ESC 3 graphic spacing |
| default_feed | 3 | 0–20 final newlines |
| auto_cut | 1 | 0/1 default cutter |
| italic | 1 | 0/1 allow native ESC 4/5 italic |
| condensed_esc | 0 | 0/1 allow native ESC M condensed font |
| raster_fallback | 1 | 0/1 use rendered bitmap for non-CP850 rich content |

Rich requests include normalized styled lines and fallback bitmaps. C emits
onboard text/styles when possible. Unsupported Unicode triggers fallback when
enabled; disabled fallback replaces unrepresentable text. Bitmap tools always
use graphics. Expanded/condensed affect the same effective column count as the UI.

## Connection settings

transport is simulation, serial, usb or system; device identifies the OS device
or queue. Serial fields: baud, data_bits, parity, stop_bits. Defaults are
9600/8/none/1. Supported baud rates are 1200 through 115200 as listed in the user
guide. No software/hardware flow control is enabled.

Windows serial uses CreateFile, DCB, WriteFile, a 15-second write timeout and
FlushFileBuffers. Win32 queues use OpenPrinter/StartDocPrinter with RAW data.
POSIX serial uses raw termios and tcdrain; Linux USB printer class writes its
device directly. Unix/macOS system queues use lp -d NAME -o raw.

Device listing reads available names without printing. Connection testing opens
the selected target without job bytes. A configured/connected status is not a
paper-sensor or physical-output guarantee.

## CLI

Commands: serve (default), text FILE, image FILE.

| Option | Meaning |
| --- | --- |
| --device PORT | Explicit serial target |
| --config FILE | Local profile path |
| --output FILE | CLI binary export, no device output |
| --port N | 1024–65535, default 8421 |
| --columns N | 20–80, default 48 |
| --dots N | 320–832, default 576 |
| --spacing N | 1–60, default 17 |
| --feed N | 0–20, default 3 |
| --no-cut | Disable final full cut |
| --no-open | Keep browser launch manual |
| --help / --version | Information only |

Explicit serve options override saved corresponding values for that process.
The UI saves the active settings to the profile. CLI file printing requires
--device or --output. Exit codes: 0 success, 1 I/O/encoding failure, 2 arguments.

## ESC/Bema and bitmap contracts

| Operation | Bytes |
| --- | --- |
| Initialize / CP850 | ESC @ / ESC t 02 |
| Bold on/off | ESC E / ESC F |
| Italic on/off | ESC 4 / ESC 5 |
| Underline | ESC - n |
| Alignment | ESC a n |
| Expanded / reset | SO / DC4 |
| Condensed | ESC M n |
| Graphic spacing / restore | ESC 3 n / ESC 2 |
| Graphic band | ESC * 33 nL nH + three bytes per column |
| Full cut | ESC w 00 |

PBM P4 is row-aligned, MSB-first, 1=black. JSON images accept the original
continuous packed stream or packing:"row". C handles padding, centers smaller
web images and transposes to 24-dot vertical bands. Final partial bands are
zero-padded. Never mix ESC/POS commands with this dialect.

bp_cp850 distinguishes invalid text from unsupported Unicode. Encoding errors
can leave partial buffers: discard them with bp_free rather than sending them.

## API inventory

All routes are local; no login or tokens. POST requires X-Bematech-Client: 1,
Content-Length, matching Host, and matching Origin when supplied. No CORS is
provided. Configuration only accepts supported device paths/transport values.

| Method/path | Purpose |
| --- | --- |
| GET /api/info | Version, mode and native paper options |
| GET/POST /api/settings | Printer settings |
| GET/POST /api/connection | Transport/device/serial parameters |
| GET /api/devices | Available local ports/queues |
| POST /api/connection/test | Open/check access without printing |
| GET /api/status | Configured connection status |
| GET /api/jobs | Last 20 jobs |
| GET /api/server-diagnostic | Local computer metrics |
| GET/POST /api/calculator/printers | Default/custom printer catalog |
| POST /api/calculator/quotes | Save data/result objects |
| GET /api/calculator/history | Latest 100 quotes |
| GET /api/calculator/history.csv | Original-format safe CSV |
| POST /api/document/read | filename, data_base64, mode text/raster |
| POST /api/print | Raw P4 request body |
| POST /api/text | Raw UTF-8 request body |
| POST /api/print/text | JSON text, cut, feed |
| POST /api/print/document | rich_lines and/or rendered pages, cut/feed/format |
| POST /api/print/list-rich | Prepared rich-list lines and/or rendered pages |
| POST /api/print/image | width, height, data_base64, optional packing |
| POST /api/print/images | images array, gap, cut/feed |
| POST /api/print/test-page, /api/print/probe | Printer diagnostics |
| POST /api/calibration/print | kind and candidate integers |
| POST /api/calibration/apply | kind and selected value |
| POST /api/feed, /api/cut, /api/print/raw | Finishing or explicit raw bytes |

The web bridge prepares rich_lines/pages; raw HTML is not a public remote
rendering service. Success is 200, 201 for created data and 202 for sent/simulated
jobs. Errors use JSON error and HTTP 400/403/404/500. Sent means bytes delivered,
not verified paper output.

## Bounds and behavior

Headers: 16 KiB. Request buffer: 16 MiB. Encoded print job: 4 MiB. Bitmap height:
1..6000, width <=dots. Quotes: 80 KB/request. Native document: 10 MB, 100 text or
50 raster pages. Conversion subprocesses have timeouts and private temporary
directories. Requests/physical jobs are served sequentially.

There is no idempotent physical print transaction. Do not blindly retry after
a lost response. Local Host/Origin checks reduce browser misuse but do not
protect against malicious local software. Remote exposure requires a separate
authorization/security design.

## Third-party references

[cJSON](https://github.com/DaveGamble/cJSON),
[PDF.js](https://github.com/mozilla/pdf.js),
[Win32 printer APIs](https://learn.microsoft.com/en-us/windows/win32/printdocs/writeprinter),
[AppDir](https://docs.appimage.org/reference/appdir.html).
