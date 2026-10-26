# Architecture, configuration and API

[Português](../pt-BR/TECNICO.md)

## Flow and modules

```text
Original Windows 98 UI → local bridge → monochrome bitmap pages
→ loopback HTTP → native C app → ESC/Bema encoder → selected transport
```

| Module | Responsibility |
| --- | --- |
| `include/bematech.h`, `src/bematech.c` | Public byte-buffer API, limits, UTF-8/CP850, wrapping, PBM P4 and 24-dot ESC-star encoding |
| `include/native.h` | Native app, response, JSON, device, conversion and diagnostics contracts |
| `src/main.c` | CLI parsing, input/output files, server launch |
| `src/app.c` | JSON state, atomic configuration writes, validation, API dispatch, calibration, jobs, calculator history and CSV |
| `src/device.c` | Device discovery, Win32 COM and RAW spooler, POSIX termios, Linux USB printer-class, CUPS RAW queue |
| `src/server.c` | Single-client loopback HTTP, Host/Origin/header boundaries, embedded assets, browser launch |
| `src/documents.c` | Private temporary document conversion using Poppler/LibreOffice, page extraction/rasterization and cleanup |
| `src/process.c` | Native argument-based subprocess execution and converter timeouts |
| `src/diagnostic.c` | Windows/Linux/macOS CPU, RAM, disk, OS and uptime |
| `third_party/cjson/` | Vendored cJSON and MIT license |
| `web/index.html`, `styles.css`, `design.css` | Original Windows 98 shell, responsive workspace and paper preview |
| `web/app.js`, `patch.js`, `utilities.js` | Original core tools, previews, tests, calibration and interactions |
| `web/editor-v2.js`, `photo-file-v2.js`, `draw-v1.js` | Advanced editor, photo/document handling and drawing |
| `web/calculator-3d.js`, `model-3d.js`, `server-diagnostic.js` | Complete calculator, software-rendered mesh viewer and printable diagnostics |
| `web/local-bridge.js` | Native API adapter, browser simulation, text rasterization and exports |
| `web/local-documents.js`, `pdf*.mjs` | Browser-only PDF/Office adapter; PDF.js license is included |
| `web/local-settings.js`, `local-settings.css` | Connection dialog, serial configuration, device list and export controls |
| `web/i18n.js` | English/PT-BR UI translation, including dynamically created controls |
| `cmake/EmbedWeb.cmake` | Embeds all web assets into the native executable |
| `tests/` | C byte contracts, HTTP/CLI/persistence tests, virtual serial and original mesh fixture |
| `packaging/`, `.github/workflows/build.yml`, `tools/checksums.py` | Native packages, four-platform CI and SHA-256 manifests |

## State and configuration

First launch defaults to simulation. The saved connection is restored at next
launch; no port is opened merely by restoring it. Save/test or print opens it.
`--device` overrides the restored transport with serial for the current process.
Explicit CLI overrides affect server settings; later saves persist current state.
Standalone `text`/`image` CLI commands use their supplied options, not the profile.

| OS | Default profile |
| --- | --- |
| Windows | `%APPDATA%/Bematech-Printer/settings.json` |
| macOS | `~/Library/Application Support/Bematech-Printer/settings.json` |
| Linux | `$XDG_CONFIG_HOME/bematech-printer/settings.json`, otherwise `~/.config/bematech-printer/settings.json` |

`--config FILE` chooses another profile. The JSON contains `settings`,
`connection`, custom `printers`, the latest 100 `quotes` and `jobs`, and a job
`counter`. Writes use a temporary file and replace the target; POSIX files use
mode 0600. Invalid profiles cause startup to fail instead of silently losing data.
Browser-only simulation stores settings and history in localStorage. Document
content, drawings, photos and meshes are not automatically persisted.

| Setting | Default | Range |
| --- | --- | --- |
| `cols_a` / `cols_b` | 48 / 64 | 20–80 / 30–120 |
| `dots` / `image_width` | 576 / 576 | 320–832 / 8–832; image width ≤ dots |
| `line_spacing` | 17 | 1–60 |
| `default_feed` | 3 | 0–20 |
| `auto_cut`, `italic`, `raster_fallback` | 1 | 0/1 |
| `condensed_esc` | 0 | 0/1 |

Connection: `transport` is `simulation`, `serial`, `usb` or `system`; `device`
is a port or queue. Serial settings: baud 1200/2400/4800/9600/19200/38400/57600/
115200, 7/8 data bits, none/even/odd parity, 1/2 stop bits. Defaults: 9600 8N1.
USB CDC uses serial. Direct printer-class USB uses `/dev/usb/lpN` on Linux;
Windows uses its RAW spooler; macOS uses a configured CUPS RAW queue (`system`).
System queues require OS printing tools/services. No libusb bulk driver is included.

## CLI

`bematech-printer [serve|text FILE|image FILE] [options]`

| Option | Default / behavior |
| --- | --- |
| `--device PORT` | Explicit serial override; needed for CLI printing unless exporting |
| `--config FILE` | Native server profile path |
| `--output FILE` | CLI ESC/Bema export; takes precedence over device; invalid for serve |
| `--port N` | 8421; 1024–65535, IPv4 loopback |
| `--columns N` | 48; 20–80 |
| `--dots N` | 576; 320–832 |
| `--spacing N` | 17; 1–60 |
| `--feed N` | 3; 0–20 |
| `--no-cut` | Disable final guillotine command |
| `--no-open` | Keep browser launch disabled |
| `--help`, `--version` | Print information and exit |

Exit codes: 0 success, 1 I/O/encoding failure, 2 invalid CLI arguments.

## HTTP API

All routes use the exact printed `http://127.0.0.1:PORT` Host. POSTs require
`Content-Length` and `X-Bematech-Client: 1`; supplied Origin must match. No
accounts, CORS permission or chunked request bodies. JSON unless stated otherwise.

| Method/path | Contract |
| --- | --- |
| GET `/api/info` | Version, transport/mode, dots, columns, spacing, feed, cut |
| GET `/api/settings` | Current calibration/settings object |
| POST `/api/settings` | Merge validated integer settings; returns `{ok,settings}` |
| GET/POST `/api/connection` | Read/replace connection object; GET also returns config path |
| GET `/api/devices` | `{devices:[{transport,device,label}]}` |
| POST `/api/connection/test` | Open current connection without printing; `{ok,state}` |
| GET `/api/status` | Configured transport/device/state, not live paper/cover sensors |
| GET `/api/jobs` | Latest 20 metadata entries, newest first |
| GET `/api/server-diagnostic` | Local OS, uptime, CPU, RAM, disk |
| GET/POST `/api/calculator/printers` | Built-ins plus custom printers; POST: name, power_w, max_power_w, note |
| POST `/api/calculator/quotes` | Save `{data,result}` calculation snapshot |
| GET `/api/calculator/history` | Latest 100 quotes, newest first |
| GET `/api/calculator/history.csv` | UTF-8 BOM, semicolon CSV, formula-prefix escaping |
| POST `/api/document/read` | `{filename,data_base64,mode:"text"|"raster"}` → `{filename,mode,pages}` |
| POST `/api/print/document`, `/api/print/list-rich` | Native contract: `{pages:[bitmap],gap,feed,cut}`; browser adapter converts rich HTML/list to pages |
| POST `/api/print/image` | One bitmap, feed/cut |
| POST `/api/print/images` | `{images:[bitmap],gap,feed,cut}` |
| POST `/api/print/text` | `{text,feed,cut}` using CP850 |
| POST `/api/print/raw` | `{data_base64}` ESC/Bema bytes |
| POST `/api/print/test-page`, `/api/print/probe` | Text/style test or small graphic test |
| POST `/api/calibration/print` | `{kind,candidates}` for normal/condensed columns, width or spacing |
| POST `/api/calibration/apply` | `{kind,value}`; validated persistent setting update |
| POST `/api/feed`, `/api/cut` | `{lines:1..30}` or empty object |
| POST `/api/print` | Raw binary PBM P4 compatibility endpoint |
| POST `/api/text` | Raw UTF-8 compatibility endpoint |

Bitmap: `width`, `height`, `data_base64`, `packing:"row"|"continuous"` (default
continuous). One means black; row form is MSB-first with ceil(width/8) bytes per
row; continuous form packs all pixels without row padding. Small bitmaps are
centered within configured dots. Printing returns HTTP 202 `{id,status,bytes}`;
status is `simulated` or `sent`. Delivered bytes do not certify physical output.

```sh
curl http://127.0.0.1:8421/api/info
curl --fail http://127.0.0.1:8421/api/print/text \
  -H 'X-Bematech-Client: 1' -H 'Content-Type: application/json' \
  --data '{"text":"Hello printer","feed":3,"cut":true}'
```

## Encoding and limits

C engine: `bp_defaults`, `bp_append`/`bp_free`, `bp_text`, `bp_bitmap`, `bp_pbm`.
Transport: `bp_send`; server: `bp_serve`. Encoders return 0/-1; discard partial
buffers after errors. Device commands: ESC @, ESC t 02 (CP850), ESC 3 n,
ESC * 33 nL nH with three bytes per column, ESC 2, ESC w 00 (cut).

HTTP headers ≤16 KiB; full request ≤16 MiB; encoded job ≤4 MiB; bitmap height
≤6000, width ≤dots; ≤100 pages/job; rich browser text ≤2000 rows. Converter input
≤10 MB, PDF text ≤100 pages, raster ≤50 pages. Converter timeouts bound external
processes; working directories are removed after conversion. Jobs are synchronous
inside this app. Do not let other processes write to the same printer concurrently.

The CLI rejects printer control characters and invalid/non-CP850 UTF-8. Browser
rich text becomes raster, supporting installed-font glyphs. Windows uses native
COM or RAW spooler APIs; POSIX uses termios or `lp -o raw`. Discovery never prints.
Loopback protections do not isolate the app from other programs on the same PC.
