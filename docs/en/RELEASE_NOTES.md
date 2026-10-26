# 0.1.1 — initial preview, packaging update

Windows uses the static MSVC runtime, so a separate Visual C++ redistributable
is not needed. The release-wide SHA256SUMS manifest matches the final,
platform-prefixed download filenames. Version 0.1.0 was the initial CI preview.

Includes a C99 printer engine, Win32/POSIX serial adapters, embedded local
web studio, CLI export/print, English and Brazilian Portuguese UI, six tools,
PNG/PBM/ESC-Bema export, local-only HTTP boundary checks, native packaging and
documented simulation.

This is a preview release. Native CI checks compile/test/package behavior.
Physical printing has not been certified across all operating systems in this
release. Test a short receipt on your own MP-4200 in ESC/Bema mode.

## Current limits

- Desktop apps use the default browser as their graphical interface.
- Windows packages are not certificate-signed; macOS packages are not notarized.
- This is not an ESC/POS driver, fiscal document issuer or generic USB printer spooler.
- No PDF/Office import, 3D model viewer, rich HTML editor or cloud history.
- No device auto-detection or live paper/cover sensor polling.
- Native printer settings are command-line options; restart to change them.
- No authentication or remote-access deployment mode.
- Content and session history reset on browser reload.
- CLI text supports CP850; other characters should use the web bitmap route.
