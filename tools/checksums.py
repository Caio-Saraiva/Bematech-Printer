"""Build-time package checksums. Python is not an application dependency."""
import hashlib
import sys
from pathlib import Path

directory = Path(sys.argv[1])
entries = []
for path in sorted(directory.iterdir()):
    if path.is_file() and path.name != "SHA256SUMS":
        entries.append(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}")
(directory / "SHA256SUMS").write_text("\n".join(entries) + "\n", encoding="utf-8")
