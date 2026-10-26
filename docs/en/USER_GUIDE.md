# Installation and complete user guide

[English](USER_GUIDE.md) · [Português](../pt-BR/GUIA_DO_USUARIO.md)

## Install and launch

| Platform | Distribution | Launch |
| --- | --- | --- |
| Windows x86-64 | NSIS .exe or portable ZIP | Start-menu shortcut or extracted bin/bematech-printer.exe |
| Linux x86-64 | .deb, AppImage or ZIP | Desktop entry or terminal |
| macOS Intel / Apple silicon | DMG or ZIP | Drag .app to Applications; open it |

Choose the matching CPU architecture. Windows packages have no public
code-signing certificate; macOS apps have an ad-hoc signature, not Apple
notarization. Follow your OS policy or build from source.

Debian/Ubuntu:

~~~sh
sudo apt install ./*bematech-printer*.deb
bematech-printer
~~~

AppImage:

~~~sh
chmod +x bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage
./bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage
# If FUSE is unavailable:
./bematech-linux-x86_64-Bematech-Printer-x86_64.AppImage --appimage-extract-and-run
~~~

The executable opens http://127.0.0.1:8421. Keep it running while using the
web UI. Ctrl+C stops a terminal session. macOS app processes can also be
stopped in Activity Monitor. Closing the browser does not stop the local C
server. Use --port 8425 for another instance.

On Windows, open PowerShell in the extracted bin/ directory for CLI commands.
For a macOS DMG installation, the CLI is:

~~~sh
"/Applications/Bematech Printer.app/Contents/MacOS/bematech-printer" --help
~~~

## Configure USB/Serial locally

Open **Connection**, which replaces the original authentication action.

| Transport | Device | Use |
| --- | --- | --- |
| Simulation | None | Try every utility without opening hardware |
| Serial / USB CDC | COM3, /dev/ttyACM0, /dev/ttyUSB0, /dev/cu.usbmodem… | MP-4200 presenting as a serial device |
| USB | /dev/usb/lpN on Linux; installed USB RAW queue on Windows | USB printer-class mode |
| System RAW queue | Installed printer name | Windows spooler or Unix/macOS CUPS |

Press Detect devices, select an entry or type the port/queue, choose serial
settings, then Save. **Save and test connection** opens the configured device
without printing. It does not certify paper/cover status. Simulation never
opens a physical port, including in the hosted demo.

Serial defaults are 9600 baud, 8 data bits, no parity, one stop bit. Supported
baud rates: 1200, 2400, 4800, 9600, 19200, 38400, 57600 and 115200; data bits
7/8; parity none/even/odd; stop bits 1/2. These controls apply to serial only.

USB CDC is a serial transport even though the cable is USB. Printer-class
USB and CUPS/spooler RAW queues are distinct. The device must accept ESC/Bema.
A Windows system queue must be installed with a suitable driver/port. A CUPS
queue must forward RAW bytes rather than render them as a document.

On Linux, use the distribution's serial/printer device group (commonly dialout
or lp), then sign out and back in after a group change. Do not make the device
world-writable. A /dev/serial/by-id/ name is preferable to a changing ttyACM
number. Use one process per physical printer.

## Editor and paper preview

Select text for bold, italic and underline. Use left/center/right alignment,
expanded text and condensed font. Condensed mode respects the compatibility
switch in Settings. The original rich editor, column-based line wrapping,
paper preview, zoom and draggable split divider are retained.

A normal column count of 48 and condensed count of 64 are starting points;
calibrate your actual unit. Text outside CP850 is rasterized by the browser.
Glyph coverage depends on installed browser fonts.

The preview is turned into monochrome page data before C sends the job.
Rich web printing is a bitmap path; CLI text also has an onboard CP850 text
path. Keep Cut and Feed controls set for the desired finishing behavior.

## Lists

Enter a title and rich text items, one item per line. The original utility adds
date/time, markers and continuation indentation. Bold/italic/underline inside
items are preserved. Print or export the resulting preview.

## Files, PDF and Office

The File tab retains line numbering, header, condensed font, per-page cut or
continuous printing, and page-gap controls. Supported text/code is read directly
in the browser. Blank lines and global numbering across text pages are retained.

PDF/Office offers Literal text or Rasterize and optimize:

| Environment | PDF | Office |
| --- | --- | --- |
| Native C app | Poppler text/raster | LibreOffice → PDF → Poppler |
| Browser demo/static UI | Bundled PDF.js text/raster | Modern Office XML text; text-based raster approximation |

Native helpers must be available as pdfinfo, pdftotext, pdftoppm and
libreoffice. On Windows the default Program Files LibreOffice path is also
recognized. These are optional OS installations, not Python packages.
On Debian/Ubuntu they are provided by poppler-utils and LibreOffice; on macOS
use your preferred Poppler/LibreOffice installation. Add the helper binaries
to PATH before starting the C app.

Native Office formats: DOC, DOCX, ODT, RTF, PPT, PPTX, XLS and XLSX. Browser
extraction supports DOCX, ODT, PPTX, XLSX and RTF. Binary DOC/PPT/XLS in the demo
require export to PDF or a modern Office format. Browser Office raster output
does not preserve the complete LibreOffice page layout.

Limits: 10 MB original document, up to 100 text pages or 50 raster pages.
Native extracted text is limited to 20,000 characters per page. Raster output
is cropped, resized, enhanced and thresholded, with a 2,000-pixel height cap.
Native conversions use private temporary directories and delete them afterward.
The demo never uploads the document.

## Photo

All original controls remain:

- Width (limited by usable print-head width), auto levels and automatic adjustment.
- Thermal photo, Document, Logo/QR and Dark photo presets.
- Brightness -1..1, contrast .2..4, gamma .2..4 and threshold 0..255.
- Atkinson, Floyd–Steinberg, Bayer and threshold-only rendering.
- Inversion, quarter-turn rotation, pixel enlargement and Game Boy Camera mode.

Choose an image supported by your browser. The original stays in browser
memory; the native application receives a monochrome bitmap. Use threshold
rather than dithering for QR/logos when crisp edges are required.

## Drawing

The original drawing tools include brush, shade, flood fill, eraser,
rectangular/freehand selection and selected-area deletion. Choose fine/medium/
thick brushes, grayscale, opacity, continuous shading pressure, aspect ratio
and portrait/landscape orientation. Undo/redo and keyboard shortcuts are kept.

Draw with mouse, pen or touch directly on the preview. Gray values are
converted to dithering for thermal output. Changing ratio/orientation resets
the canvas history, as in the original app.

## Complete 3D cost calculator

The full original calculator is retained, not the simplified 0.1 form:

1. Material, spool price, slicer weight, quantity and waste/purge.
2. Printer catalog/custom printers, average power, time and electricity tariff.
3. Depreciation, printer value, useful life and residual value.
4. Manual work/time rate, packaging, extras and failure reserve.
5. Payment fee, selling-price margin, discount, minimum charge and rounding.
6. Detailed receipt or customer version, saved history and CSV export.

Time accepts decimal hours, 06:30 or 6h30. Reference tariff and printer powers
are editable examples; use the effective electricity cost and measured average
power for your situation. Values remain BRL, matching the original calculator.

~~~text
billed weight = slicer weight × (1 + waste / 100)
energy = average watts / 1000 × print hours × tariff
depreciation/hour = value × (1 - residual / 100) / useful life
operating cost = material + energy + machine + labor + packaging + extras
total cost = operating cost × (1 + failure reserve / 100)
list price = max(total cost / (1 - margin/100 - fee/100), minimum charge)
final price = list price × (1 - discount/100)
profit = final price × (1 - fee/100) - total cost
~~~

Margin + fee must be less than 100%. Discount changes effective margin.
Commercial rounding is shown separately. History keeps the latest 100 quotes.
CSV preserves the original columns and prevents spreadsheet formula injection.

## 3D model viewing and printing

Choose STL (ASCII/binary), OBJ, 3MF or ASCII FBX. Model files stay in the browser.
The original parser normalizes and optimizes meshes; the UI caps large meshes
at 35,000 rendered triangles and files at 30 MB.

- Drag: orbit. Alt + drag: Z rotation. Right button or Shift + drag: pan.
- Wheel or numeric control: zoom, up to 4×.
- Set position/rotation fields or use the orientation cube.
- Choose the source UP axis (±X/±Y/±Z).
- Switch perspective/orthographic projection or reframe.
- Choose Matte, Metallic, Reflective, Technical CAD, Wireframe, Principal edges,
  Solid principal edges or Custom.
- Adjust light, ground/shadow, brightness, contrast, gamma, threshold and dithering.
- Custom material exposes gray color, roughness, metallic, smoothness and lighting.
- Resolution multiplier controls the original stylized pixel rendering.

Press Print to send the final monochrome model image. This prints a thermal
representation of the current pose, not G-code or a physical 3D object.
Supported 3MF compression depends on the browser; unsupported FBX binary files
should be exported as ASCII FBX, STL or OBJ.

## Diagnostics, calibration and exports

Computer shows a printable local OS/CPU/RAM/disk/uptime report. Demo metrics
are explicitly synthetic examples. Tests offers printer status, font/accent
test, graphics test, feed, cut, job history, RAW and calibration.

The calibration wizard supports normal/condensed columns, head width and
graphic spacing. Shift ranges, refine by one, compare a physical strip, then
apply the selected/manual value. Manual application asks for confirmation.
Settings also exposes the ten paper/compatibility values documented technically.

Export PNG (preview), PBM P4 (row-aligned bitmap), or ESC/Bema (complete device
bytes). Physical serial success confirms byte delivery, not paper status.
Inspect uncertain jobs before issuing a second copy.

## Local persistence and troubleshooting

Settings, connection, custom 3D printers, quotes and recent jobs persist in the
native profile. Editor/photo/model/drawing working content is page memory:
export before reloading. The demo stores its catalog/history/settings in browser
local storage; clearing site data removes them.

| Problem | Check |
| --- | --- |
| Port occupied | Stop the other instance or use --port |
| Printer inaccessible | Device/queue name, cable, OS permissions and other apps |
| Commands print as letters | Confirm proprietary ESC/Bema mode |
| Image seams | Calibrate graphic band spacing |
| Office/PDF fails natively | Install helper executables and check PATH |
| Browser Office raster differs | Use native LibreOffice conversion or export PDF |
| CLI rejects Unicode | Use browser bitmap printing or CP850-compatible text |
| Settings cannot save | Profile directory permissions, space and file validity |
| Browser cannot connect | Keep the C executable running; use its exact 127.0.0.1 URL |
