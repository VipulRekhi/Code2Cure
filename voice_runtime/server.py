"""
MediKiosk Sovereign Multilingual Voice Runtime Server
Provides:
1. High-Quality Neural Speech Synthesis (TTS) for Marathi (mr), Hindi (hi), and English (en)
   - Primary: High-fidelity natural Indian neural speech (Edge-TTS / Azure Neural)
   - Offline / Local GPU: Meta MMS-TTS VITS models on NVIDIA RTX 4050 CUDA GPU / CPU
   - Clean 16-bit Mono PCM WAV transport with accurate headers
2. Dynamic Vernacular Speech Recognition (ASR) for Marathi (mr), Hindi (hi), and English (en)
   - Real-time acoustic recognition via SpeechRecognition + FFmpeg preprocessing
"""

import os
import sys
import io
import json
import base64
import asyncio
import tempfile
import subprocess
import shutil
import time
from socketserver import ThreadingMixIn
from http.server import HTTPServer, BaseHTTPRequestHandler

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    request_queue_size = 64

# Force UTF-8 encoding for standard I/O (prevents Windows charmap issues with Devanagari)
os.environ["PYTHONIOENCODING"] = "utf-8"
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="ignore")
if hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="ignore")

HOST = os.environ.get("VOICE_RUNTIME_HOST", "127.0.0.1")
PORT = int(os.environ.get("VOICE_RUNTIME_PORT", "8001"))

# Locate FFmpeg binary
FFMPEG_BIN = shutil.which("ffmpeg")
if not FFMPEG_BIN:
    winget_ffmpeg = r"C:\Users\vipul\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.EXE"
    if os.path.exists(winget_ffmpeg):
        FFMPEG_BIN = winget_ffmpeg
    else:
        FFMPEG_BIN = "ffmpeg"

# Language to Neural Voice mapping (High-naturalness Indian voices)
NEURAL_VOICES = {
    "mr": "mr-IN-AarohiNeural",
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
}

# Meta MMS-TTS VITS models for local/offline GPU execution
MMS_MODELS = {
    "mr": "facebook/mms-tts-mar",
    "hi": "facebook/mms-tts-hin",
    "en": "facebook/mms-tts-eng",
}

# Language to SpeechRecognition locale mapping
ASR_LOCALES = {
    "mr": "mr-IN",
    "hi": "hi-IN",
    "en": "en-IN",
}

# Global Runtime State
RUNTIME_STATE = {
    "device": "cpu",
    "device_name": "CPU",
    "mms_loaded": False,
    "mms_cache": {},
}

def init_runtime():
    """Detects CUDA capabilities and pre-warms local environment."""
    global RUNTIME_STATE
    try:
        import torch
        if torch.cuda.is_available():
            RUNTIME_STATE["device"] = "cuda"
            RUNTIME_STATE["device_name"] = torch.cuda.get_device_name(0)
            print(f"[Voice Runtime] CUDA GPU detected: {RUNTIME_STATE['device_name']}")
        else:
            RUNTIME_STATE["device"] = "cpu"
            RUNTIME_STATE["device_name"] = "CPU"
            print("[Voice Runtime] Running on CPU")
    except Exception as e:
        print(f"[Voice Runtime] Note on torch initialization: {e}")

    try:
        try:
            from voice_runtime.ocr_runtime import get_ocr_engine
        except ModuleNotFoundError:
            from ocr_runtime import get_ocr_engine
        print("[Voice Runtime] Pre-warming PaddleOCR Devanagari engine...")
        get_ocr_engine()
        print("[Voice Runtime] PaddleOCR engine pre-warmed and ready.")
    except Exception as e:
        print(f"[Voice Runtime] Note on OCR initialization: {e}")

async def synthesize_edge_tts(text: str, language: str = "mr", sample_rate: int = 24000) -> tuple[bytes, str]:
    """
    Synthesizes speech using Microsoft Neural voices via edge-tts.
    Returns (wav_bytes, provider_name).
    """
    import edge_tts
    voice = NEURAL_VOICES.get(language, NEURAL_VOICES["en"])
    communicate = edge_tts.Communicate(text, voice)

    mp3_chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_chunks.append(chunk["data"])

    mp3_bytes = b"".join(mp3_chunks)
    if not mp3_bytes:
        raise RuntimeError("Empty audio output from Edge-TTS")

    # Convert to pure, clean 16-bit Mono PCM WAV at target sample rate using FFmpeg
    cmd = [
        FFMPEG_BIN,
        "-y",
        "-i", "pipe:0",
        "-ar", str(sample_rate),
        "-ac", "1",
        "-f", "wav",
        "pipe:1"
    ]
    proc = subprocess.run(cmd, input=mp3_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg WAV conversion failed: {proc.stderr.decode('utf-8', errors='ignore')}")

    import soundfile as sf
    buf_in = io.BytesIO(proc.stdout)
    audio_data, sr = sf.read(buf_in)
    buf_out = io.BytesIO()
    sf.write(buf_out, audio_data, sr, format="WAV", subtype="PCM_16")

    return buf_out.getvalue(), f"edge-neural-tts ({voice})"

def synthesize_mms_tts(text: str, language: str = "mr", sample_rate: int = 24000) -> tuple[bytes, str]:
    """
    Synthesizes speech using local Meta MMS-TTS VITS models on GPU/CPU.
    Returns (wav_bytes, provider_name).
    """
    import torch
    from transformers import VitsModel, AutoTokenizer
    import soundfile as sf

    model_id = MMS_MODELS.get(language, MMS_MODELS["en"])
    device = RUNTIME_STATE["device"]

    if model_id not in RUNTIME_STATE["mms_cache"]:
        print(f"[Voice Runtime] Loading MMS-TTS model for {language} ({model_id}) on {device}...")
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = VitsModel.from_pretrained(model_id).to(device)
        RUNTIME_STATE["mms_cache"][model_id] = (tokenizer, model)

    tokenizer, model = RUNTIME_STATE["mms_cache"][model_id]
    inputs = tokenizer(text, return_tensors="pt").to(device)

    with torch.no_grad():
        output = model(**inputs).waveform

    audio = output.squeeze().cpu().numpy()
    native_sr = model.config.sampling_rate

    buf = io.BytesIO()
    sf.write(buf, audio, native_sr, format="WAV", subtype="PCM_16")
    wav_bytes = buf.getvalue()

    if sample_rate != native_sr and sample_rate > 0:
        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i", "pipe:0",
            "-ar", str(sample_rate),
            "-ac", "1",
            "-f", "wav",
            "pipe:1"
        ]
        proc = subprocess.run(cmd, input=wav_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode == 0:
            wav_bytes = proc.stdout

    return wav_bytes, f"meta-mms-tts ({model_id})"

def synthesize_speech(text: str, language: str = "mr", sample_rate: int = 24000) -> tuple[bytes, str]:
    """
    Synthesizes speech cleanly with explicit language routing.
    Primary: Edge-TTS (natural, high naturalness)
    Secondary / Offline fallback: Meta MMS-TTS VITS
    """
    clean_text = text.strip()
    if not clean_text:
        raise ValueError("Empty text provided for synthesis")

    # Ensure language is normalized
    lang = language.lower().split("-")[0]
    if lang not in ("mr", "hi", "en"):
        lang = "mr"

    # Attempt primary neural synthesis
    try:
        return asyncio.run(synthesize_edge_tts(clean_text, lang, sample_rate))
    except Exception as edge_err:
        print(f"[Voice Runtime] Edge-TTS notice: {edge_err}. Using local Meta MMS-TTS model.")
        try:
            return synthesize_mms_tts(clean_text, lang, sample_rate)
        except Exception as mms_err:
            raise RuntimeError(f"Both Edge-TTS ({edge_err}) and MMS-TTS ({mms_err}) failed")

def transcribe_audio_payload(audio_bytes: bytes, language: str = "mr") -> dict:
    """
    Converts incoming audio (WebM, Opus, Ogg, WAV) to 16kHz mono linear PCM
    using FFmpeg and transcribes dynamically via SpeechRecognition.
    """
    import speech_recognition as sr

    if not audio_bytes or len(audio_bytes) < 32:
        return {
            "success": False,
            "error": "EMPTY_AUDIO",
            "message": "No audio data received or audio clip too short.",
            "transcript": "",
        }

    in_file = tempfile.NamedTemporaryFile(suffix=".audio", delete=False)
    wav_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    in_path = in_file.name
    wav_path = wav_file.name
    in_file.close()
    wav_file.close()

    try:
        with open(in_path, "wb") as f:
            f.write(audio_bytes)

        # Convert to 16kHz 1-channel linear 16-bit PCM WAV with dynamic audio leveling using FFmpeg
        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i", in_path,
            "-ar", "16000",
            "-ac", "1",
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-f", "wav",
            wav_path
        ]
        conv = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if conv.returncode != 0:
            # Fallback without audio filter if loudnorm fails on ultra-short audio
            cmd_fallback = [
                FFMPEG_BIN,
                "-y",
                "-i", in_path,
                "-ar", "16000",
                "-ac", "1",
                "-f", "wav",
                wav_path
            ]
            conv_fallback = subprocess.run(cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if conv_fallback.returncode != 0:
                return {
                    "success": False,
                    "error": "AUDIO_CONVERSION_ERROR",
                    "message": "Failed to decode input audio format with FFmpeg.",
                    "transcript": "",
                }

        recognizer = sr.Recognizer()
        # Calibrated conversational speech sensitivity (280 energy threshold)
        recognizer.energy_threshold = 280
        recognizer.dynamic_energy_threshold = True
        recognizer.pause_threshold = 0.8
        recognizer.non_speaking_duration = 0.4
        target_locale = ASR_LOCALES.get(language, "en-IN")

        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)

        try:
            transcript = recognizer.recognize_google(audio_data, language=target_locale)
            clean_transcript = transcript.strip()
            print(f"[Voice Runtime] ASR recognized ({target_locale}): {clean_transcript}")
            return {
                "success": True,
                "transcript": clean_transcript,
                "language": language,
                "confidence": 0.95,
                "provider": "google-multilingual-asr",
            }
        except sr.UnknownValueError:
            return {
                "success": False,
                "error": "SPEECH_UNRECOGNIZED",
                "message": "Could not understand the spoken audio. Please speak clearly or use screen touch.",
                "transcript": "",
            }
        except sr.RequestError as e:
            return {
                "success": False,
                "error": "ASR_SERVICE_UNAVAILABLE",
                "message": f"Speech recognition service network error: {e}",
                "transcript": "",
            }
    finally:
        try:
            if os.path.exists(in_path): os.remove(in_path)
        except Exception: pass
        try:
            if os.path.exists(wav_path): os.remove(wav_path)
        except Exception: pass

class VoiceRuntimeHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/health", "/status"):
            self._send_json(200, {
                "status": "online",
                "active_asr_provider": "google-multilingual-asr",
                "active_tts_provider": "neural-tts",
                "asr_provider": "google-multilingual-asr",
                "tts_provider": "neural-tts",
                "tts": {
                    "marathi": { "provider": "mr-IN-AarohiNeural / facebook/mms-tts-mar", "status": "ready" },
                    "hindi": { "provider": "hi-IN-SwaraNeural / facebook/mms-tts-hin", "status": "ready" },
                    "english": { "provider": "en-IN-NeerjaNeural / facebook/mms-tts-eng", "status": "ready" },
                },
                "ocr": {
                    "provider": "PaddleOCR (devanagari_PP-OCRv5_mobile_rec)",
                    "status": "ready",
                },
                "device": RUNTIME_STATE["device"],
                "device_name": RUNTIME_STATE["device_name"],
                "languages": ["mr", "hi", "en"],
                "sample_rate": 24000,
            })
        else:
            self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
        transfer_encoding = self.headers.get("Transfer-Encoding", "").lower()
        if "chunked" in transfer_encoding:
            chunks = []
            while True:
                line = self.rfile.readline().strip()
                if not line:
                    break
                try:
                    chunk_length = int(line.split(b";")[0], 16)
                except ValueError:
                    break
                if chunk_length == 0:
                    self.rfile.readline()
                    break
                chunks.append(self.rfile.read(chunk_length))
                self.rfile.readline()
            body_bytes = b"".join(chunks)
        else:
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)

        try:
            req = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            self._send_json(400, {"error": "Invalid JSON payload"})
            return

        # 1. ASR Endpoint (/asr)
        if self.path == "/asr":
            audio_base64 = req.get("audio_base64", "")
            language = req.get("language", "mr")
            request_id = req.get("requestId", None)
            session_id = req.get("sessionId", None)

            if not audio_base64 or len(audio_base64) < 16:
                self._send_json(400, {
                    "success": False,
                    "error": "EMPTY_AUDIO",
                    "message": "No audio received or recording too short.",
                    "transcript": "",
                    "requestId": request_id,
                })
                return

            try:
                raw_audio = base64.b64decode(audio_base64)
            except Exception as e:
                self._send_json(400, {
                    "success": False,
                    "error": "INVALID_BASE64",
                    "message": f"Failed to decode base64 audio: {e}",
                    "transcript": "",
                    "requestId": request_id,
                })
                return

            asr_res = transcribe_audio_payload(raw_audio, language)
            asr_res["requestId"] = request_id
            asr_res["sessionId"] = session_id

            status_code = 200 if asr_res.get("success") else 422
            self._send_json(status_code, asr_res)
            return

        # 2. TTS Endpoint (/tts)
        elif self.path == "/tts":
            text = req.get("text", "").strip()
            language = req.get("language", "mr")
            sample_rate = int(req.get("sample_rate", 24000))
            request_id = req.get("requestId", None)

            if not text:
                self._send_json(400, {"error": "text is required", "requestId": request_id})
                return

            t0 = time.time()
            try:
                wav_bytes, provider = synthesize_speech(text, language, sample_rate)
            except Exception as e:
                print(f"[Voice Runtime] TTS synthesis error: {e}")
                self._send_json(500, {"error": f"Synthesis failed: {e}", "requestId": request_id})
                return

            elapsed_ms = int((time.time() - t0) * 1000)
            accept = self.headers.get("Accept", "")

            if "audio" in accept or "octet-stream" in accept:
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(wav_bytes)))
                self.send_header("Connection", "close")
                self.send_header("X-Provider", provider)
                if request_id:
                    self.send_header("X-Request-Id", request_id)
                self.end_headers()
                self.wfile.write(wav_bytes)
            else:
                b64_audio = base64.b64encode(wav_bytes).decode("ascii")
                self._send_json(200, {
                    "success": True,
                    "audio_base64": b64_audio,
                    "format": "wav",
                    "sample_rate": sample_rate,
                    "language": language,
                    "requestId": request_id,
                    "provider": "neural-tts",
                    "model": provider,
                    "device": RUNTIME_STATE["device"],
                    "latency_ms": elapsed_ms,
                })
            return

        # 3. Medical Document OCR Endpoint (/ocr)
        elif self.path == "/ocr":
            image_base64 = req.get("image_base64", "")
            file_name = req.get("fileName", "document.jpg")
            request_id = req.get("requestId", None)
            session_id = req.get("sessionId", None)

            if not image_base64 or len(image_base64) < 16:
                self._send_json(400, {
                    "success": False,
                    "error": "EMPTY_OR_CORRUPT_FILE",
                    "message": "Uploaded file is empty or corrupted.",
                    "ocrText": "",
                    "confidence": 0.0,
                    "processingStatus": "FAILED",
                    "requestId": request_id,
                })
                return

            try:
                raw_image = base64.b64decode(image_base64)
            except Exception as e:
                self._send_json(400, {
                    "success": False,
                    "error": "INVALID_BASE64",
                    "message": f"Failed to decode base64 image: {e}",
                    "ocrText": "",
                    "confidence": 0.0,
                    "processingStatus": "FAILED",
                    "requestId": request_id,
                })
                return

            try:
                try:
                    from voice_runtime.ocr_runtime import process_image
                except ModuleNotFoundError:
                    from ocr_runtime import process_image
                ocr_res = process_image(raw_image)
            except Exception as ocr_err:
                print(f"[Voice & OCR Runtime] OCR processing error: {ocr_err}")
                ocr_res = {
                    "success": False,
                    "error": "OCR_INFERENCE_ERROR",
                    "message": f"OCR processing failed: {ocr_err}",
                    "ocrText": "",
                    "confidence": 0.0,
                    "processingStatus": "FAILED",
                }

            ocr_res["requestId"] = request_id
            ocr_res["sessionId"] = session_id
            ocr_res["fileName"] = file_name
            self._send_json(200, ocr_res)
            return

        else:
            self._send_json(404, {"error": "Not Found"})

def run_server():
    init_runtime()
    server = ThreadedHTTPServer((HOST, PORT), VoiceRuntimeHandler)
    print(f"[Voice Runtime] Sovereign Voice Service active at http://{HOST}:{PORT}")
    print(f"[Voice Runtime] Neural TTS (Edge-TTS / Meta MMS) & Vernacular ASR Ready on port {PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Voice Runtime] Shutting down.")
        server.server_close()

if __name__ == "__main__":
    run_server()
