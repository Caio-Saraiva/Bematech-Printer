"""Integration tests for the loopback server and safe simulated transport."""
import http.client
import json
import socket
import subprocess
import sys
import tempfile
import time
import shutil
import io
import zipfile
import base64
import concurrent.futures
from pathlib import Path

binary = str(Path(sys.argv[1]).resolve())
with socket.socket() as probe:
    probe.bind(("127.0.0.1", 0))
    port = probe.getsockname()[1]
profile_directory = tempfile.TemporaryDirectory()
profile = Path(profile_directory.name) / "settings.json"
process = subprocess.Popen([binary, "serve", "--no-open", "--port", str(port), "--config", str(profile)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
def request(method, path, body=None, headers=None):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
    connection.request(method, path, body=body, headers=headers or {})
    response = connection.getresponse()
    data = response.read()
    connection.close()
    return response.status, data
try:
    for attempt in range(100):
        if process.poll() is not None:
            raise AssertionError(process.stderr.read().decode())
        try:
            status, data = request("GET", "/api/info")
            break
        except OSError:
            time.sleep(0.03)
    else:
        raise AssertionError("Server failed to start")
    assert status == 200 and json.loads(data)["mode"] == "simulation"
    assert request("GET", "/")[0] == 200
    assert request("GET", "/../../etc/passwd")[0] == 404
    assert request("GET", "/", headers={"Host": "attacker.example"})[0] == 403
    pbm = b"P4\n1 1\n\x80"
    assert request("POST", "/api/print", pbm)[0] == 403
    headers = {"X-Bematech-Client": "1", "Origin": f"http://127.0.0.1:{port}"}
    status, data = request("POST", "/api/print", pbm, headers)
    assert status == 202 and json.loads(data)["status"] == "simulated"
    assert request("POST", "/api/print", b"P4\n1 1\n", headers)[0] == 400
    assert request("POST", "/api/text", b"\x1b@", headers)[0] == 400
    assert request("POST", "/api/text", "ação".encode(), headers)[0] == 202
    assert request("POST", "/api/print", pbm, {**headers, "Origin": "https://attacker.example"})[0] == 403
    def api(path, body=None):
        status, payload = request("GET" if body is None else "POST", path,
                                  None if body is None else json.dumps(body).encode(),
                                  headers)
        return status, json.loads(payload)
    assert api("/api/settings")[1]["cols_a"] == 48
    assert api("/api/settings", {"dots": 596, "image_width": 596})[0] == 200
    assert api("/api/settings", {"dots": 320})[0] == 400
    assert api("/api/settings", {"unknown": 42})[0] == 400
    assert api("/api/connection")[1]["transport"] == "simulation"
    assert api("/api/connection", {"transport": "serial", "device": "/etc/passwd"})[0] == 400
    assert api("/api/connection/test", {})[1]["state"] == "simulation"
    assert isinstance(api("/api/devices")[1]["devices"], list)
    assert api("/api/server-diagnostic")[1]["cpu"]["logical_cores"] >= 1
    assert api("/api/calculator/printers", {"name": "Virtual 3D", "power_w": 123, "max_power_w": 300})[0] == 201
    assert len(api("/api/calculator/printers")[1]["printers"]) == 3
    assert api("/api/calculator/quotes", {"data": {"material": "=formula", "printer": "Virtual 3D"}, "result": {"finalPrice": 12.5}})[0] == 201
    assert len(api("/api/calculator/history")[1]["quotes"]) == 1
    assert b"'=formula" in request("GET", "/api/calculator/history.csv")[1]
    for path in ("/api/print/test-page", "/api/print/probe", "/api/feed", "/api/cut"):
        assert api(path, {})[0] == 202, path
    assert api("/api/calibration/print", {"kind": "width", "candidates": [576, 596]})[0] == 202
    assert api("/api/calibration/apply", {"kind": "line_spacing", "value": 18})[0] == 200
    image = {"width": 9, "height": 2, "data_base64": "gEAA", "packing": "continuous"}
    assert api("/api/print/image", image)[0] == 202
    assert api("/api/print/document", {"pages": [image], "cut": False, "feed": 0})[0] == 202
    assert api("/api/print/images", {"images": [image, image], "gap": 1})[0] == 202
    assert api("/api/print/raw", {"data_base64": "G0A="})[0] == 202
    assert profile.exists() and json.loads(profile.read_text())["settings"]["dots"] == 596
    if shutil.which("pdfinfo") and shutil.which("pdftotext"):
        import base64
        objects = [b"<< /Type /Catalog /Pages 2 0 R >>",
                   b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                   b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
                   b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
        content = b"BT /F1 14 Tf 20 150 Td (Bematech native document test) Tj ET"
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
        document = {"filename": "receipt.pdf", "data_base64": base64.b64encode(pdf).decode(), "mode": "text"}
        status, value = api("/api/document/read", document)
        assert status == 200 and "Bematech native document test" in value["pages"][0], value
        if shutil.which("pdftoppm"):
            status, value = api("/api/document/read", {**document, "mode": "raster"})
            assert status == 200 and value["pages"][0]["width"] <= 596, value
            assert value["pages"][0]["packing"] == "row"
        if shutil.which("libreoffice"):
            package = io.BytesIO()
            with zipfile.ZipFile(package, "w") as archive:
                archive.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
                archive.writestr("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
                archive.writestr("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Office import parity</w:t></w:r></w:p></w:body></w:document>')
            status, value = api("/api/document/read", {"filename": "sample.docx", "data_base64": base64.b64encode(package.getvalue()).decode(), "mode": "text"})
            assert status == 200 and "Office import parity" in value["pages"][0], value
    with tempfile.TemporaryDirectory() as directory:
        text = Path(directory) / "input.txt"
        output = Path(directory) / "output.bin"
        text.write_text("ação", encoding="utf-8")
        subprocess.run([binary, "text", str(text), "--output", str(output)], check=True)
        assert output.read_bytes() == b"\x1b@\x1bt\x02a\x87\xc6o\n\n\n\x1bw\x00"
        if sys.platform != "win32":
            import os
            import pty
            import select
            master, slave = pty.openpty()
            try:
                # Darwin's tcdrain waits for the PTY master to consume output.
                # Read concurrently instead of waiting for the writer to exit.
                writer = subprocess.Popen([binary, "text", str(text), "--device", os.ttyname(slave)],
                                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                try:
                    expected = output.read_bytes()
                    received = b""
                    while len(received) < len(expected):
                        assert select.select([master], [], [], 5)[0], "Virtual serial timed out"
                        received += os.read(master, 1024)
                    _, stderr = writer.communicate(timeout=5)
                    assert writer.returncode == 0, stderr
                    assert received == expected
                finally:
                    if writer.poll() is None:
                        writer.kill()
                        writer.wait()
                # Compare row-packed and continuous bitmaps through the real
                # HTTP-to-serial path, including centering on a 596-dot head.
                assert api("/api/connection", {"transport": "serial", "device": os.ttyname(slave)})[0] == 200
                encoded = []
                for packing, payload in (("row", b"\x80\x00\x80\x00"), ("continuous", b"\x80\x40\x00")):
                    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                        pending = pool.submit(api, "/api/print/image", {
                            "width": 9, "height": 2, "packing": packing,
                            "data_base64": base64.b64encode(payload).decode(), "feed": 0, "cut": False})
                        received = b""
                        expected_size = 5 + 3 + 5 + 596 * 3 + 1 + 2
                        while len(received) < expected_size:
                            assert select.select([master], [], [], 5)[0], "HTTP virtual serial timed out"
                            received += os.read(master, 8192)
                        assert pending.result(timeout=5)[0] == 202
                        encoded.append(received)
                assert encoded[0] == encoded[1], "Bitmap packing changed physical positioning"
                assert encoded[0][8:13] == b"\x1b*!\x54\x02"
                assert encoded[0][13 + ((596 - 9) // 2) * 3] == 192
                assert api("/api/connection", {"transport": "simulation", "device": ""})[0] == 200
            finally:
                os.close(master)
                os.close(slave)
    # Persisted calibration, quotes and jobs survive a fresh native process.
    process.terminate()
    process.wait(timeout=5)
    process = subprocess.Popen([binary, "serve", "--no-open", "--port", str(port), "--config", str(profile)],
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    for attempt in range(100):
        try:
            status, data = request("GET", "/api/settings")
            break
        except OSError:
            time.sleep(.03)
    assert status == 200 and json.loads(data)["dots"] == 596
    assert api("/api/calculator/history")[1]["quotes"][0]["result"]["finalPrice"] == 12.5
    assert len(api("/api/jobs")[1]["jobs"]) >= 8
    process.terminate()
    process.wait(timeout=5)
    process = subprocess.Popen([binary, "serve", "--no-open", "--port", str(port), "--config", "relative.json"],
                               cwd=profile_directory.name, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    for attempt in range(100):
        try:
            request("GET", "/api/info")
            break
        except OSError:
            time.sleep(.03)
    assert api("/api/settings", {"default_feed": 4})[0] == 200
    assert (Path(profile_directory.name) / "relative.json").is_file()
    print("Integration passed: persistence, connection settings, bitmap packing/centering, HTTP boundaries, CLI and virtual serial.")
finally:
    process.terminate()
    process.wait(timeout=5)
    profile_directory.cleanup()
