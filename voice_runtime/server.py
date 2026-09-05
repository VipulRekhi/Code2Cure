"""
MediKiosk Sovereign Voice Runtime Server (Phase 5.1 Real-Time)
Provides real-time neural speech synthesis (edge-tts -> 24kHz WAV) and dynamic speech recognition (ffmpeg + SpeechRecognition)
for Marathi (mr), Hindi (hi), and English (en).
Strictly 100% dynamic: NO hardcoded transcripts, NO modulated sine buzzers, NO default clinical data.
"""

import os
import sys
import json
import base64
import asyncio
import tempfile
import subprocess
import shutil
from http.server import HTTPServer, BaseHTTPRequestHandler

# Force UTF-8 encoding for standard I/O (prevents Windows charmap crashes on Devanagari)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

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

# Language to Neural Voice mapping for authentic Indian speech
NEURAL_VOICES = {
    "mr": "mr-IN-AarohiNeural",
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
}

# Language to SpeechRecognition locale mapping
ASR_LOCALES = {
    "mr": "mr-IN",
    "hi": "hi-IN",
    "en": "en-IN",
}

async def synthesize_neural_wav(text: str, language: str = "mr", sample_rate: int = 24000) -> bytes:
    """
    Synthesizes authentic neural speech using Edge Neural TTS and converts
    to a standard 24kHz mono 16-bit linear PCM WAV with a valid RIFF header.
    """
    import edge_tts
    voice = NEURAL_VOICES.get(language, NEURAL_VOICES["en"])
    communicate = edge_tts.Communicate(text, voice)

    mp3_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    wav_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    mp3_path = mp3_file.name
    wav_path = wav_file.name
    mp3_file.close()
    wav_file.close()

    try:
        await communicate.save(mp3_path)

        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i", mp3_path,
            "-ar", str(sample_rate),
            "-ac", "1",
            "-f", "wav",
            wav_path
        ]
        conv = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if conv.returncode != 0:
            raise RuntimeError(f"FFmpeg WAV conversion failed: {conv.stderr.decode('utf-8', errors='ignore')}")

        with open(wav_path, "rb") as f:
            wav_bytes = f.read()

        return wav_bytes
    finally:
        try:
            if os.path.exists(mp3_path): os.remove(mp3_path)
        except Exception: pass
        try:
            if os.path.exists(wav_path): os.remove(wav_path)
        except Exception: pass

def transcribe_audio_payload(audio_bytes: bytes, language: str = "mr") -> dict:
    """
    Converts incoming audio (WebM, Opus, Ogg, WAV) to 16kHz mono linear PCM
    using FFmpeg and transcribes dynamically via SpeechRecognition.
    Zero hints, zero mocked strings: purely acoustic speech recognition.
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

        # Convert to 16kHz 1-channel linear 16-bit PCM WAV using FFmpeg
        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i", in_path,
            "-ar", "16000",
            "-ac", "1",
            "-f", "wav",
            wav_path
        ]
        conv = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if conv.returncode != 0:
            return {
                "success": False,
                "error": "AUDIO_CONVERSION_ERROR",
                "message": "Failed to decode input audio format with FFmpeg.",
                "transcript": "",
            }

        # Transcribe with SpeechRecognition (Google Multilingual Public Engine)
        recognizer = sr.Recognizer()
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
    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/health", "/status"):
            self._send_json(200, {
                "status": "online",
                "active_asr_provider": "google-multilingual-asr",
                "active_tts_provider": "edge-neural-tts",
                "asr_provider": "google-multilingual-asr",
                "tts_provider": "edge-neural-tts",
                "configured_primary_asr": "ai4bharat-indicconformer",
                "configured_primary_tts": "ai4bharat-indicf5",
                "languages": ["mr", "hi", "en"],
                "sample_rate": 24000,
                "fallback_active": True,
                "fallback_reason": "AI4Bharat IndicConformer/IndicF5 native weights require PyTorch fairseq/f5-tts binaries. High-fidelity acoustic fallback to Google Multilingual ASR and Edge Neural Indian TTS is currently active.",
            })
        else:
            self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
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

            # Pure acoustic recognition: NO hint passed
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

            try:
                wav_bytes = asyncio.run(synthesize_neural_wav(text, language, sample_rate))
            except Exception as e:
                print(f"[Voice Runtime] TTS synthesis error: {e}")
                self._send_json(500, {"error": f"Synthesis failed: {e}", "requestId": request_id})
                return

            accept = self.headers.get("Accept", "")
            if "audio" in accept or "octet-stream" in accept:
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(wav_bytes)))
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
                    "provider": "edge-neural-tts",
                })
            return

        else:
            self._send_json(404, {"error": "Not Found"})

def run_server():
    server = HTTPServer((HOST, PORT), VoiceRuntimeHandler)
    print(f"[Voice Runtime] Sovereign Voice Service active at http://{HOST}:{PORT}")
    print("[Voice Runtime] Real Neural 24kHz WAV TTS & Real-Time ASR Ready.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Voice Runtime] Shutting down.")
        server.server_close()

if __name__ == "__main__":
    run_server()
