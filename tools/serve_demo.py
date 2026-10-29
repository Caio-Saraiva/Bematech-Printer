#!/usr/bin/env python3
"""Serve a browser-only snapshot of web/ on loopback, without the native API."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8422)
    args = parser.parse_args()
    source = Path(__file__).resolve().parent.parent / "web"
    with TemporaryDirectory(prefix="bematech-demo-") as directory:
        root = Path(directory)
        shutil.copytree(source, root, dirs_exist_ok=True)
        index = root / "index.html"
        html = index.read_text(encoding="utf-8")
        # Set before any application script so native API discovery is skipped.
        html = html.replace("<head>", "<head><script>window.BEMATECH_DEMO_ONLY=true;</script>", 1)
        index.write_text(html, encoding="utf-8")
        handler = partial(SimpleHTTPRequestHandler, directory=directory)
        with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
            print(f"Browser-only demo: http://127.0.0.1:{args.port}", flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass


if __name__ == "__main__":
    main()
