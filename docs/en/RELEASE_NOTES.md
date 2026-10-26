# 0.2.1 — original Windows 98 application restored

Restores the original visual language and utilities, including the complete
3D model viewer and printing flow. Supersedes the simplified 0.1 redesign.

Finishes 0.2.0 with native styled CP850 receipts, raster fallback, preserved
manual line breaks, complete technical guides and refreshed screenshots.

- Rich editor/list, PDF/Office workflows, full photo/drawing tools and complete
  cost calculator.
- Original STL/OBJ/3MF/ASCII-FBX viewer: all materials, camera/UP/projection,
  lighting, ground, orientation cube and thermal printing.
- C99 backend with persistent profiles, USB/Serial/RAW queue configuration,
  discovery, diagnostics, calibration, history and document conversion.
- No users, login, sessions, passwords or passkeys.
- Same Windows 98 UI locally and in the simulated hosted demo.
- English-first UI, PT-BR, updated guides and real screenshots.

Native PDF/Office helpers are optional installations. Browser Office raster
uses extracted text; binary DOC/PPT/XLS require native helpers or PDF export.
See FEATURE_PARITY.md.

Builds/tests/packages target Windows x86-64, Linux x86-64, macOS Intel and Apple
silicon. Physical output is not certified by CI. Windows packages are unsigned;
macOS uses an ad-hoc signature, not notarization. The desktop app uses a browser
as its graphical UI. MSVC runtime is statically linked.
