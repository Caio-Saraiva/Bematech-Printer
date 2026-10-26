"""Generate original PDF, DOCX and 3D fixtures for browser/native parity checks."""
import io
import math
import sys
import zipfile
from pathlib import Path

out = Path(sys.argv[1] if len(sys.argv) > 1 else "output/fixtures")
out.mkdir(parents=True, exist_ok=True)
objects = [b"<< /Type /Catalog /Pages 2 0 R >>",
           b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
           b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
           b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
content = b"BT /F1 14 Tf 20 150 Td (Bematech document parity) Tj 0 -24 Td (PDF / text / raster) Tj ET"
objects.append(b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream")
pdf = bytearray(b"%PDF-1.4\n")
offsets = [0]
for index, obj in enumerate(objects, 1):
    offsets.append(len(pdf))
    pdf.extend(f"{index} 0 obj\n".encode() + obj + b"\nendobj\n")
xref = len(pdf)
pdf.extend(b"xref\n0 6\n0000000000 65535 f \n")
for offset in offsets[1:]:
    pdf.extend(f"{offset:010} 00000 n \n".encode())
pdf.extend(f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
(out / "receipt.pdf").write_bytes(pdf)

with zipfile.ZipFile(out / "receipt.docx", "w", compression=zipfile.ZIP_DEFLATED) as archive:
    archive.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    archive.writestr("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    archive.writestr("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Office import parity</w:t></w:r></w:p><w:p><w:r><w:t>English and português: ação.</w:t></w:r></w:p></w:body></w:document>')

vertices = []
faces = []
n, m = 40, 20
for i in range(n):
    a = 2 * math.pi * i / n
    for j in range(m):
        b = 2 * math.pi * j / m
        r = 1 + 0.4 * math.cos(b)
        vertices.append((r * math.cos(a), 0.4 * math.sin(b), r * math.sin(a)))
for i in range(n):
    for j in range(m):
        a, b = i * m + j + 1, ((i + 1) % n) * m + j + 1
        c, d = ((i + 1) % n) * m + (j + 1) % m + 1, i * m + (j + 1) % m + 1
        faces.extend([(a, b, c), (a, c, d)])
(out / "demo-model.obj").write_text(
    "# Original torus fixture\n" +
    "\n".join("v %.6f %.6f %.6f" % v for v in vertices) + "\n" +
    "\n".join("f %d %d %d" % f for f in faces) + "\n", encoding="utf-8")
print(out)
