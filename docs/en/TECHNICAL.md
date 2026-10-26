# Architecture, configuration and API

[English](TECHNICAL.md) · [Português](../pt-BR/TECNICO.md)

## Data flow

~~~text
HTML/CSS/JS local studio
  → canvas → threshold/dither → row-packed P4 bitmap
  → POST /api/print on IPv4 loopback
  → C P4 parser → vertical 24-dot ESC * bands → serial
~~~

The CLI bypasses HTTP: text uses the UTF-8/CP850 converter, image uses the same
P4 parser. --output exports bytes instead of opening a device. The hosted demo
has no C process and no printer bridge.

## Source map

| File/directory | Responsibility |
| --- | --- |
| include/bematech.h | Public C API, buffer/options structures, version and maximum job size |
| src/bematech.c | Bounded buffer growth, options validation, strict UTF-8 decoding, CP850 mapping, text wrapping, P4 parsing and ESC/Bema encoding |
| src/transport.c | Win32 COM transport or POSIX termios transport |
| src/server.c | Bounded single-client HTTP server, explicit asset routing, local boundary checks and browser launch |
| src/main.c | CLI parsing, file loading, job export and command dispatch |
| web/index.html | Semantic tool panels, navigation, inputs, paper preview and accessible labels |
| web/style.css | Responsive rail/workbench/paper layout and visual tokens |
| web/app.js | EN/PT-BR text, canvas rendering, dithering, file import, pointer drawing, calculations, exports and session state |
| web/icon.svg | Original app icon |
| cmake/EmbedWeb.cmake | Converts local assets to generated C arrays at build time |
| tests/test_core.c | Deterministic encoding and validation contracts, active in Release builds |
| tests/test_integration.py | Optional process/HTTP/CLI tests and virtual serial test on POSIX |
| packaging/ | Desktop entry, AppImage AppRun, macOS .app metadata/launcher and package scripts |
| .github/workflows/build.yml | Native build/test/package matrix and tagged preview releases |
| tools/checksums.py | Build-time SHA-256 package manifest generator |
| docs/ | English, Portuguese and screenshot documentation |

The engine is a CMake static library named bematech. The executable links it
with transport and server code. The generated web_assets.h remains in build/.
Changing web assets triggers regeneration and relinking.

## CLI configuration

There is no configuration file, database, environment-variable parser or
background system service. Supply options on each launch. Command names:
serve (default), text FILE, image FILE.

| Option | Default | Validation / behavior |
| --- | --- | --- |
| --device PORT | absent | Absent means simulation for serve; required for CLI printing unless --output is supplied |
| --output FILE | absent | CLI export; takes precedence over a supplied device; invalid for serve |
| --port N | 8421 | 1024–65535, IPv4 loopback only |
| --columns N | 48 | 20–120 characters per plain-text line |
| --dots N | 576 | 320–832 usable head pixels |
| --spacing N | 17 | 1–60, ESC 3 band spacing |
| --feed N | 3 | 0–20 trailing newlines |
| --no-cut | false | Disable the final ESC w 00 command |
| --no-open | false | Do not launch a browser |
| --help | — | Help without opening files/devices |
| --version | — | Application version |

All options are parsed before I/O. CLI exit codes: 0 success, 1 I/O/encoding
failure, 2 invalid command-line arguments. Browser settings live only for the
page session. Native printer options are read through /api/info and cannot be
changed remotely through the web API.

## Public C API

- bp_defaults(): conservative defaults.
- bp_append() / bp_free(): own and release a bounded dynamic byte buffer.
- bp_text(): UTF-8 → CP850, safe control-character handling, wrapping and finish.
- bp_bitmap(): row-packed 1-bit pixels → ESC-star bands.
- bp_pbm(): strict binary P4 parsing, including header comments.
- bp_send(): complete device write and drain, with error text.
- bp_serve(): starts the local app server.

Encoding functions return 0 or -1. A failed encode may leave partial bytes in
the output buffer; callers must discard them and call bp_free(). Input text
must be NUL-terminated; bitmap functions take explicit byte lengths. Never
send a partial output after an error.

## Printer protocol

| Action | Bytes |
| --- | --- |
| Initialize | ESC @ |
| Select CP850 | ESC t 02 |
| Graphic spacing | ESC 3 n |
| 24-dot graphic band | ESC * 33 nL nH, then three bytes per column |
| Restore text line spacing | ESC 2 |
| Full cut | ESC w 00 |

Input P4 rows have ceil(width/8) bytes. Bits are MSB-first and row-aligned;
padding bits at the end of a row are ignored. The encoder transposes these rows
into vertical groups of 24 dots. The final band is zero-padded.

Windows uses CreateFileA, DCB, 9600 baud / 8N1, no software/hardware flow
control, a 15-second write timeout, WriteFile and FlushFileBuffers.
POSIX uses termios, 9600 baud / 8N1, raw mode, no HUPCL and tcdrain before close.
The transport adds a short pause after draining. USB CDC baud settings may be
virtual, but match the implemented defaults when testing your device.

## HTTP API

Bind address is always 127.0.0.1. Requests require Host equal to the printed
127.0.0.1:PORT. POSTs need Content-Length and X-Bematech-Client: 1. When Origin
is supplied, it must equal http://127.0.0.1:PORT. No CORS permission or
authentication/account system is provided.

| Method/path | Body | Success |
| --- | --- | --- |
| GET /api/info | none | 200 JSON: version, mode, dots, columns, spacing, feed, cut |
| GET / or explicit asset | none | 200 embedded local UI |
| POST /api/print | Raw binary PBM P4 | 202 JSON: status (simulated/sent), bytes |
| POST /api/text | Raw UTF-8 text, no NUL | 202 JSON: status and bytes |

~~~sh
curl http://127.0.0.1:8421/api/info
curl --fail http://127.0.0.1:8421/api/print \
  -H 'X-Bematech-Client: 1' \
  -H 'Content-Type: image/x-portable-bitmap' \
  --data-binary @receipt.pbm
~~~

Error codes: 400 malformed/oversized data, 403 local boundary refusal,
404 unknown route, 500 memory/serial failure. Serial errors are detailed in the
native process stderr, not echoed with arbitrary device paths into the page.
Connections are closed after each response; chunked bodies are rejected.

## Bounds and behavior

- HTTP: 16 KiB headers, 2 MiB complete request allocation, 10-second socket
  receive/send timeouts. One connection is served at a time.
- Encoded jobs: at most 4 MiB. Bitmap: width 1..configured dots, height 1..6000.
- CLI text: rejects ESC and other device control characters (except newline,
  CR normalization and tab expansion), invalid UTF-8 and non-CP850 Unicode.
- Browser rendering: 6,000-row receipt limit, smaller image processing limits.
- Browser history: process-page memory only; no localStorage or upload storage.
- Serial jobs run synchronously, so bytes from HTTP jobs do not interleave.
  Another process can still compete for a device; use one app per printer.

Host/Origin checks reduce cross-site browser misuse but do not protect against
malicious local software. Users adding remote access must design their own
authorization, transport security and concurrency model.

## Upstream references

- [Microsoft serial handles](https://learn.microsoft.com/en-us/windows/win32/devio/communications-resource-handles)
- [Microsoft serial resource settings](https://learn.microsoft.com/en-us/windows/win32/devio/modification-of-communications-resource-settings)
- [AppImage AppDir specification](https://docs.appimage.org/reference/appdir.html)
