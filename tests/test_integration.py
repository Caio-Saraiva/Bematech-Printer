"""Integration tests for the loopback server and safe simulated transport."""
import http.client
import json
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

binary = str(Path(sys.argv[1]).resolve())
with socket.socket() as probe:
    probe.bind(("127.0.0.1", 0))
    port = probe.getsockname()[1]
process = subprocess.Popen([binary, "serve", "--no-open", "--port", str(port)],
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
                result = subprocess.run([binary, "text", str(text), "--device", os.ttyname(slave)],
                                        capture_output=True, timeout=5)
                assert result.returncode == 0, result.stderr
                assert select.select([master], [], [], 2)[0]
                assert os.read(master, 1024) == output.read_bytes()
            finally:
                os.close(master)
                os.close(slave)
    print("Integration passed: HTTP, simulation, origin/Host boundary, malformed data, CLI export and virtual serial.")
finally:
    process.terminate()
    process.wait(timeout=5)
