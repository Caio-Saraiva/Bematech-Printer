# Bematech Printer

**A little paper. Endless possibilities.**

A C99 printing engine and a local web studio for the **Bematech MP-4200 TH**.
Write receipts, print lists, dither images, draw, estimate 3D print costs and
generate calibration sheets. Runs on Windows, Linux and macOS. English first;
Brazilian Portuguese is available throughout the interface and documentation.

[Try the browser playground](https://bematech-printer-demo.lilbigcheetos.chatgpt.site) ·
[Downloads](https://github.com/Caio-Saraiva/Bematech-Printer/releases) ·
[Português do Brasil](README.pt-BR.md)

![Text studio on desktop](docs/screenshots/editor-en.png)

## Choose your way in

| Experience | What you need | Printer access |
| --- | --- | --- |
| Local desktop app | One native executable and a browser | Explicit serial port selected at startup |
| Local web version | The same executable, or serve the static UI for preview/export | Native loopback bridge for actual printing |
| Hosted playground | A browser | Simulation only; no hardware/API bridge |

Desktop packages launch the local studio in your default browser. The
application engine and HTTP server are C; the embedded interface uses vanilla
HTML, CSS and JavaScript. No Python, Node, account, cloud connection or runtime
package installation is needed to use the native app.

## Quick start

Download the package for your platform from Releases. Launch the application;
it starts in simulation, opens **http://127.0.0.1:8421** and never touches a
printer until you explicitly select a device:

~~~sh
# Linux
bematech-printer serve --device /dev/ttyACM0

# macOS — replace with the actual USB CDC port
bematech-printer serve --device /dev/cu.usbmodem1234

# Windows PowerShell
.\bematech-printer.exe serve --device COM3
~~~

Print a file or generate bytes without the web interface:

~~~sh
bematech-printer text notes.txt --output receipt.bin
bematech-printer image receipt.pbm --device /dev/ttyACM0 --no-cut
~~~

**Important:** this driver targets proprietary **ESC/Bema**, not generic ESC/POS.
The MP-4200 may present itself as a USB CDC serial device. Other command modes
and printer models need their own compatibility testing.

## Tools

| Tool | Included behavior |
| --- | --- |
| Text studio | UTF-8 input, normal/large text, alignment, TXT/MD/CSV/LOG import and bitmap preview |
| Lists & notes | Title, automatic bullets and continuation indentation |
| Image lab | PNG/JPEG/WebP, rotation, brightness, contrast, Atkinson/Floyd/Bayer/threshold |
| Drawing pad | Mouse, pen and touch, eraser, undo and clear |
| 3D cost calculator | Filament, waste, energy, labor/extras and true selling-price margin |
| Calibration | Head-width ruler, graphic bands and physical-test guidance |
| Exports | PNG preview, binary PBM P4 and native ESC/Bema job bytes |

The browser creates the exact monochrome bitmap used for printing. The C
engine converts its row-packed PBM to 24-dot vertical ESC-star bands. No original
photo or source file is uploaded to a hosted service.

## Documentation

| English | Português |
| --- | --- |
| [Install and use](docs/en/USER_GUIDE.md) | [Instalar e usar](docs/pt-BR/GUIA_DO_USUARIO.md) |
| [Architecture, configuration and API](docs/en/TECHNICAL.md) | [Arquitetura, configuração e API](docs/pt-BR/TECNICO.md) |
| [Build, test and package](docs/en/DEVELOPMENT.md) | [Compilar, testar e empacotar](docs/pt-BR/DESENVOLVIMENTO.md) |
| [Screenshots](docs/SCREENSHOTS.md) | [Capturas de tela](docs/SCREENSHOTS.md) |
| [Release notes / limitations](docs/en/RELEASE_NOTES.md) | [Notas / limitações](docs/pt-BR/NOTAS_DA_VERSAO.md) |

## Build from source

C99 compiler + CMake 3.20+:

~~~sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
./build/bematech-printer
~~~

For Visual Studio's multi-config generator, use
`.\build\Release\bematech-printer.exe` instead.
Python is optional for integration tests; it is never an application dependency.

## Project boundaries

This repository is an independent local tool. Hosted demo packaging, hosting
metadata and deployment source live in a separate private checkout. Only the
shared local interface and documentation screenshots are included here.
There is no production service configuration, account system, token, database,
tunnel or reference to a private printer endpoint.

The app has no user authentication. It binds only to IPv4 loopback, checks Host
and browser Origin and provides no CORS permission. Those local boundaries do
not turn it into an internet service. Settings and session history are in memory.

## License and support

MIT. Independent community project; not an official Bematech product.
Open issues with OS, app version, command dialect and a redacted error message.
Physical printer output still needs validation on your own hardware.

![Monochrome image processing](docs/screenshots/image-en.png)
