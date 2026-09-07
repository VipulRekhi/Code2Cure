"""
MediKiosk Sovereign Voice & OCR Multi-Service Orchestrator
Starts sovereign services with strict service-to-port isolation:
  - Port 8001: IndicConformer Vernacular ASR (/asr, /health)
  - Port 8002: PaddleOCR Devanagari OCR (/ocr, /health)
  - Port 8003: Multilingual Neural TTS (/tts, /health)

Zero port collisions. Configurable via environment variables:
  ASR_PORT (default: 8001)
  OCR_PORT (default: 8002)
  TTS_PORT (default: 8003)
"""

import os
import sys
import io
import time
import threading
import argparse

# Force UTF-8 encoding safely
os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, "reconfigure"):
    try: sys.stdout.reconfigure(encoding="utf-8", errors="ignore")
    except Exception: pass
if hasattr(sys.stderr, "reconfigure"):
    try: sys.stderr.reconfigure(encoding="utf-8", errors="ignore")
    except Exception: pass

# Ensure project root is in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
for p in [_current_dir, _parent_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from voice_runtime.asr_server import start_asr_server, PORT as DEFAULT_ASR_PORT, HOST as DEFAULT_ASR_HOST
    from voice_runtime.ocr_server import start_ocr_server, PORT as DEFAULT_OCR_PORT, HOST as DEFAULT_OCR_HOST
    from voice_runtime.tts_server import start_tts_server, PORT as DEFAULT_TTS_PORT, HOST as DEFAULT_TTS_HOST
except ModuleNotFoundError:
    from asr_server import start_asr_server, PORT as DEFAULT_ASR_PORT, HOST as DEFAULT_ASR_HOST
    from ocr_server import start_ocr_server, PORT as DEFAULT_OCR_PORT, HOST as DEFAULT_OCR_HOST
    from tts_server import start_tts_server, PORT as DEFAULT_TTS_PORT, HOST as DEFAULT_TTS_HOST

def run_all(asr_port=DEFAULT_ASR_PORT, ocr_port=DEFAULT_OCR_PORT, tts_port=DEFAULT_TTS_PORT, host="127.0.0.1"):
    print("=" * 70)
    print("  MediKiosk Sovereign Voice & OCR Multi-Service Orchestrator")
    print(f"  • ASR Service:  http://{host}:{asr_port} (/asr, /health)")
    print(f"  • OCR Service:  http://{host}:{ocr_port} (/ocr, /health)")
    print(f"  • TTS Service:  http://{host}:{tts_port} (/tts, /health)")
    print("=" * 70)

    servers = []

    # 1. Start ASR
    asr_srv = start_asr_server(host, asr_port)
    servers.append(asr_srv)
    t_asr = threading.Thread(target=asr_srv.serve_forever, daemon=True)
    t_asr.start()

    # 2. Start OCR
    ocr_srv = start_ocr_server(host, ocr_port)
    servers.append(ocr_srv)
    t_ocr = threading.Thread(target=ocr_srv.serve_forever, daemon=True)
    t_ocr.start()

    # 3. Start TTS
    tts_srv = start_tts_server(host, tts_port)
    servers.append(tts_srv)
    t_tts = threading.Thread(target=tts_srv.serve_forever, daemon=True)
    t_tts.start()

    print("\n[Orchestrator] All 3 sovereign services running cleanly on dedicated ports.")
    print("[Orchestrator] Ready to process requests. Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Orchestrator] Stopping all services...")
        for s in servers:
            try:
                s.server_close()
            except Exception:
                pass
        print("[Orchestrator] Clean shutdown complete.")

def main():
    parser = argparse.ArgumentParser(description="MediKiosk Sovereign Voice & OCR Runtime")
    parser.add_argument("--service", choices=["all", "asr", "ocr", "tts"], default="all", help="Service to run")
    parser.add_argument("--asr-port", type=int, default=DEFAULT_ASR_PORT, help="ASR port (default 8001)")
    parser.add_argument("--ocr-port", type=int, default=DEFAULT_OCR_PORT, help="OCR port (default 8002)")
    parser.add_argument("--tts-port", type=int, default=DEFAULT_TTS_PORT, help="TTS port (default 8003)")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default 127.0.0.1)")

    args = parser.parse_args()

    if args.service == "all":
        run_all(args.asr_port, args.ocr_port, args.tts_port, args.host)
    elif args.service == "asr":
        srv = start_asr_server(args.host, args.asr_port)
        try: srv.serve_forever()
        except KeyboardInterrupt: srv.server_close()
    elif args.service == "ocr":
        srv = start_ocr_server(args.host, args.ocr_port)
        try: srv.serve_forever()
        except KeyboardInterrupt: srv.server_close()
    elif args.service == "tts":
        srv = start_tts_server(args.host, args.tts_port)
        try: srv.serve_forever()
        except KeyboardInterrupt: srv.server_close()

if __name__ == "__main__":
    main()
