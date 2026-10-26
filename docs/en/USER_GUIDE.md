# Install and use

[English](USER_GUIDE.md) · [Português](../pt-BR/GUIA_DO_USUARIO.md)

## Platform installation

| Platform | Package | Launch |
| --- | --- | --- |
| Windows x86-64 | NSIS installer (.exe) or portable ZIP | Start menu shortcut, or extracted bin/bematech-printer.exe |
| Linux x86-64 | Debian .deb, AppImage or portable ZIP | Desktop menu or terminal |
| macOS Apple silicon / Intel | DMG with .app or portable ZIP | Open the app or run the executable from Terminal |

Use the architecture matching your machine. Preview releases are unsigned by
a public Windows code-signing certificate; macOS apps have an ad-hoc signature,
not Apple notarization. Follow your organization's policy for locally built
software. A native build is available if your OS blocks downloaded binaries.

On Debian/Ubuntu:

~~~sh
sudo apt install ./bematech-printer-*.deb
bematech-printer
~~~

On AppImage-capable distributions:

~~~sh
chmod +x Bematech-Printer-x86_64.AppImage
./Bematech-Printer-x86_64.AppImage
# If the host lacks FUSE:
./Bematech-Printer-x86_64.AppImage --appimage-extract-and-run
~~~

The UI is embedded in the executable. Keep the app running while using the
studio. Ctrl+C stops a terminal session. On macOS, close the app process from
Activity Monitor if launched without a terminal. Only one instance can occupy
a given port; use --port 8425 for a second instance.

## First run: simulation

Launch without a device. The app opens http://127.0.0.1:8421 and shows
SIMULATION. Try each tool, press Simulate print, inspect the session list and
export a PNG. Simulation never opens a serial device.

For a browser-only local preview, serve web/ with a static server. For example,
if Python is already installed:

~~~sh
python3 -m http.server 8422 --bind 127.0.0.1 --directory web
~~~

This optional static setup has preview/export only. Actual printing needs the
C native bridge. The hosted playground is the same kind of browser-only
experience, with a separate deployment wrapper that disables API discovery.

## Connect your MP-4200 TH

1. Connect USB and power, insert paper and close the cover.
2. Identify the CDC serial device. Windows: Device Manager → Ports (COM & LPT).
   Linux: inspect /dev/ttyACM* or /dev/serial/by-id/. macOS: /dev/cu.usbmodem*.
3. Stop the simulation instance and restart with the port:

~~~sh
bematech-printer serve --device /dev/ttyACM0
~~~

4. The banner changes to SERIAL READY. This means a port was configured at
   startup; it is not a live physical status probe.
5. Print a short test, check alignment and confirm the printer's command mode.
   Never run two apps against the same physical port.

On Linux, grant your user access using the distribution's serial-device group,
commonly dialout; log out and in after changing group membership. Do not grant
world-writable permissions to the device. USB reconnects can change ttyACM
numbers; a stable /dev/serial/by-id/ path is preferable when available.

## Text studio

Type or import UTF-8 TXT, Markdown, CSV or LOG. Imports are plain text, not rich
document conversion. Choose normal/large size and left/center/right alignment.
The first line is emphasized as a heading. The remaining lines preserve
manual line breaks and wrap by character count.

The preview is rendered as a bitmap using the browser's monospace font.
Available glyphs depend on the OS/browser font; missing emoji/CJK fonts can
produce missing glyphs. PNG and PBM preserve exactly the generated bitmap.

Input limit: 16,000 characters; imported file: 64 KB maximum. A single receipt
must stay within 6,000 rows. Split long text into multiple jobs.

## Lists & notes

Enter a title and one item per line. Empty items are ignored. The app adds
bullets and continuation indentation automatically. Edit the title to label a
shopping list, checklist or packing list, then export or print.

## Image lab

Choose PNG, JPEG or WebP (maximum 10 MB / 32 megapixels). Images remain in the
browser. Transparency is composited on white before conversion. Choose:

| Setting | Effect |
| --- | --- |
| Atkinson | High-contrast dotted look, useful for thermal paper |
| Floyd–Steinberg | More tonal detail through propagated error |
| Bayer 4×4 | Ordered, regular pattern |
| Threshold | Pure black/white conversion, no error diffusion |
| Width | Full, 75% or 50% of the configured head width, centered |
| Brightness | Shift gray levels from -100 to +100 |
| Contrast | Scale gray separation from 0.25 to 2.5 |
| Rotate | Quarter-turn clockwise |

Load test artwork generates an original landscape test pattern locally.
Raster height is limited to 1,800 pixels before margins. A tall image is
scaled into that height; use a cropped source to preserve its proportions.

## Drawing pad

Draw with a mouse, pen or finger. Brush width is 1–24 source pixels. Eraser
paints white; Undo restores one of the last 12 snapshots. Clear saves an undo
snapshot before clearing. Touch drawing stays within the canvas.

## 3D cost calculator

Use one currency consistently. Enter filament weight, price per kg, waste
percentage, print duration, average watts, electricity per kWh and labor/extras.
Average power is different from the printer's maximum rated wattage.

~~~text
material = grams / 1000 × price_per_kg × (1 + waste / 100)
energy   = hours × average_watts / 1000 × electricity_per_kWh
cost     = material + energy + extras
price    = cost / (1 - profit_margin / 100)
~~~

A 30% margin is a percentage of the selling price, not a 30% markup on cost.
For cost 10, price is 14.29, not 13. Use extras for depreciation, packaging,
labor and other costs. The tool does not calculate taxes, payment fees,
discounts or risk reserves separately. Enter these deliberately in your model.
Results are estimates; no tariff is fetched and no quote is stored on a server.

## Calibration

Export/print the sheet, examine both margins and look for gaps between the
24-dot bands. Restart the native app with corrected --dots and --spacing
values. --columns controls plain-text wrapping. Screen measurements cannot
determine the physical thermal head's actual usable width.

## Exports and session history

- PNG: exact monochrome preview, suitable for sharing.
- PBM: P4 binary, row-aligned MSB-first pixels, one bit means black. Reprint
  using the image CLI.
- ESC/Bema: complete device job including initialization, image bands, feed and
  cut. It is device-specific binary data, not an image file.

Session history is in memory and shows the last five entries plus total count.
Reloading loses all content and history. Save a file if you need to keep it.
A successful serial response confirms byte delivery; paper/jam status still
requires inspection. Do not automatically retry after an uncertain timeout.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Address already in use | Stop the other instance or choose --port |
| Browser cannot reach app | Keep the executable running; use the exact printed 127.0.0.1 URL |
| Permission denied / Serial error | Port name, USB cable, group/device permissions and other apps holding the port |
| Commands appear as text | Printer is in the wrong dialect; this implementation expects ESC/Bema |
| White seams in images | Adjust --spacing after examining a physical band test |
| Text is replaced/missing in CLI | CLI supports UTF-8 characters representable in CP850; use web bitmap rendering for other Unicode |
| Browser preview only | Native bridge unavailable; restart the executable and navigate to its URL |
| UI content resets | Intentional in-memory operation; export before reload |
