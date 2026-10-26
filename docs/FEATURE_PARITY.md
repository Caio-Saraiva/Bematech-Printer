# Original application parity / Paridade com o original

Version 0.2 restores the original Windows 98 application instead of the
unrelated simplified studio from 0.1. Original styles and utility modules are
the baseline. The 3D viewer keeps its original features and includes local print adaptation.

A versão 0.2 restaura o aplicativo Windows 98 original, substituindo o estúdio
simplificado da 0.1. Estilos e utilitários originais são a referência.
O visualizador 3D mantém seus recursos originais, com adaptação para impressão local.

| Capability / Recurso | Local C app | Demo |
| --- | --- | --- |
| Windows 98 layout, bevels, title bar, paper, splitter/zoom | Preserved | Same |
| Rich text/list and column/style rules | Preserved; C bitmap output | Same preview; simulated output |
| All photo controls/presets/Game Boy | Original module | Same |
| Brush/shade/fill/eraser/selection/undo/redo | Original module; login gate removed | Same |
| Full calculator/customer quote | Original formulas and receipts | Same |
| Printer catalog, quote history and CSV | Native local profile | Browser storage |
| STL/OBJ/3MF/ASCII-FBX viewing and printing | Original viewer; C output | Original viewer; simulation |
| All materials, camera, UP, cube, light, ground | Original controls retained | Same |
| PDF text and raster | Native Poppler | Bundled PDF.js |
| Modern Office text | LibreOffice conversion | Browser XML extraction |
| Office raster layout | LibreOffice + Poppler | Extracted-text approximation |
| Legacy DOC/PPT/XLS | LibreOffice | Export as PDF or modern Office first |
| Computer diagnostics | Real local OS metrics in C | Explicit sample metrics |
| Tests/calibration/RAW/feed/cut | C commands and saved settings | Simulated jobs |
| USB/Serial configuration | Discover, configure, test, save | Demonstrates controls without opening hardware |
| Authentication | Removed | Removed |

## Intentional differences

The backend is C99 instead of Python. The shared browser interface stays
HTML/CSS/JavaScript; device transport and ESC/Bema encoding are C.
Rich web receipts use native CP850 text and ESC/Bema alignment, bold, italic
and underline commands from C. Characters outside CP850 use monochrome page
fallbacks with the original style/column rules. Photo, drawing and 3D previews
become ESC-star bands in C. CLI text also has a direct UTF-8/CP850 path.

Account-scoped storage becomes a local profile. No credentials, account system,
tunnel or private service deployment are included. Diagnostic reports describe
the user's computer; demo metrics are labeled examples.

The PDF/Office tool remains available in both environments, with the converter
appropriate to each. Browser Office raster is not a full LibreOffice layout
renderer. Binary Office formats need native helpers or conversion to PDF.

Regression corrections restore paper visibility after leaving Photo/Model and
preserve non-byte-aligned raster rows.

## Verification

Native checks cover encoding, virtual serial, settings/history/CSV, calibration,
discovery and PDF/Office conversion when helpers are installed. Browser checks
exercise eight tabs at 360/768/1280 widths, 3D pose/material/printing, file
import, exports and the connection dialog. Physical validation is separate.
