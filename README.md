# Bematech Printer

**The original Windows 98 printing application, with a native C99 backend.**

Rich text, rich lists, text/PDF/Office import, photo processing, advanced
drawing, the complete 3D cost calculator, **3D model viewing and printing**,
diagnostics and calibration are retained. No authentication is required.
Configure USB/Serial/system RAW output from the Windows 98 connection dialog.

[Try the demo](https://thermaldemo.caiosaraiva.com) ·
[Native downloads](https://github.com/Caio-Saraiva/Bematech-Printer/releases) ·
[Português brasileiro](README.pt-BR.md)

![Windows 98 editor](docs/screenshots/editor-en.png)
![3D model viewer and printing](docs/screenshots/model-3d-en.png)

## Versions

| Experience | UI | Output |
| --- | --- | --- |
| Windows / Linux / macOS app | Original HTML/CSS/JS embedded in a native C executable | C ESC/Bema; Serial, USB printer class or installed RAW queue |
| Local web | The same original interface served by the C app | Native loopback backend |
| Hosted demo | The same interface and utilities | Simulated; no hardware or printer backend |

The app opens your browser at **http://127.0.0.1:8421**. Python and Node are not
application runtime requirements. Optional native PDF/Office helpers are
documented below. The browser-only demo runs as a separate static service.

## Self-hosted demo

The public demo uses `https://thermaldemo.caiosaraiva.com`, routed through
Cloudflare Tunnel to `http://127.0.0.1:8422` on the server.
Python 3 is required only for this static demo server:

~~~sh
python3 tools/serve_demo.py --port 8422
~~~

This serves a temporary snapshot of `web/` with browser simulation forced
before the application loads. It provides no native API or printer access.
Only static web assets are served; repository files are outside the web root.

For a Linux user service (checkout at `~/Bematech-Printer`):

~~~sh
mkdir -p ~/.config/systemd/user
cp packaging/bematech-demo.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now bematech-demo.service
~~~

Enable lingering with `sudo loginctl enable-linger "$USER"` to start at boot
and keep running after logout. Restart `bematech-demo.service` after updates
to refresh the static snapshot.

In the existing Cloudflare Tunnel, add a published application route for
`thermaldemo.caiosaraiva.com` with service type **HTTP** and URL
`127.0.0.1:8422`. The tunnel connector must run on this host to reach loopback.
Use the tunnel's DNS record, rather than the previous Sites custom-domain
target. Tunnel credentials and account configuration stay outside Git.

## First run

1. Download and launch the package for your OS and CPU.
2. Open **Connection**. Try simulation first.
3. For physical output, choose **Serial / USB CDC**, **USB** or a
   **system RAW queue**, then select or enter the device.
4. Set serial baud rate, data bits, parity and stop bits if applicable.
5. Save and test the connection, then print a short test sheet.

The MP-4200 commonly presents as USB CDC: choose its COM, /dev/tty or /dev/cu
serial port. USB printer-class output uses /dev/usb/lpN on Linux or an installed
RAW queue on Windows/macOS. This driver targets **ESC/Bema**, not ESC/POS.

~~~sh
bematech-printer
bematech-printer serve --device /dev/ttyACM0
bematech-printer serve --config /path/to/settings.json --port 8425
bematech-printer text notes.txt --output receipt.bin
bematech-printer image receipt.pbm --device /dev/ttyACM0 --no-cut
~~~

## Preserved utilities

| Tool | Features |
| --- | --- |
| Editor | Bold/italic/underline, alignment, expanded/condensed, deterministic columns, zoom and resizable split preview |
| List | Rich items, title/date, bullets and continuation indentation |
| File | Text/code, PDF/Office, literal or optimized raster, numbering, headers, page gaps and per-page cutting |
| Photo | Auto levels/adjustment, presets, brightness/contrast/gamma, dithering, threshold, inversion, rotation, pixel scaling and Game Boy Camera |
| Drawing | Brush, continuous shade, fill, eraser, rectangular/freehand selection, grayscale, opacity, ratio/orientation, undo/redo |
| 3D calculator | Original costs, depreciation, labor, failure reserve, fee, margin, discount, rounding, customer receipt, printer catalog, history and CSV |
| 3D model | STL/OBJ/3MF/ASCII FBX, camera, UP axis, orientation cube, projections, all materials, light/ground/shadow and monochrome printing |
| Computer | Printable local OS/CPU/RAM/disk/uptime report |
| Tests/settings | Test sheets, feed, cut, RAW, adjustable calibration ranges/manual values and saved paper settings |
| Connection | Discovery, USB/RAW queue, serial parameters, connection test and persistent profile |

PNG/PBM/ESC-Bema preview export is also available.

## Documentation

| English first | Português brasileiro |
| --- | --- |
| [Install and use every tool](docs/en/USER_GUIDE.md) | [Instalar e usar cada ferramenta](docs/pt-BR/GUIA_DO_USUARIO.md) |
| [Architecture, configuration and API](docs/en/TECHNICAL.md) | [Arquitetura, configuração e API](docs/pt-BR/TECNICO.md) |
| [Build, test and package](docs/en/DEVELOPMENT.md) | [Compilar, testar e empacotar](docs/pt-BR/DESENVOLVIMENTO.md) |
| [Parity and intentional differences](docs/FEATURE_PARITY.md) | [Paridade e diferenças](docs/FEATURE_PARITY.md) |
| [Screenshots](docs/SCREENSHOTS.md) | [Capturas](docs/SCREENSHOTS.md) |
| [Release notes](docs/en/RELEASE_NOTES.md) | [Notas da versão](docs/pt-BR/NOTAS_DA_VERSAO.md) |

## Build

C99 compiler + CMake 3.20+:

~~~sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
./build/bematech-printer
~~~

Visual Studio outputs the executable under build/Release/. Packages target
Windows x86-64, Linux x86-64 and macOS Intel/Apple silicon.

## Data and licenses

Settings, custom 3D printers, quotes and recent jobs stay in your local profile.
Demo data stays in browser storage. The native app binds to IPv4 loopback and
checks Host/Origin. No accounts, credential database or private service
deployment is included.

Application: MIT. cJSON: MIT. PDF.js: Apache-2.0. Notices are included.
Independent project, not an official Bematech product. Validate physical output
on your printer and command mode before relying on it operationally.
