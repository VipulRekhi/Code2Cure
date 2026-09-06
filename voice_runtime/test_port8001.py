import urllib.request
import json
import io
import wave
import base64
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

def test_language(lang, text):
    print(f"\n[Test] Requesting {lang.upper()} TTS: '{text}'...")
    t0 = time.time()
    payload = json.dumps({
        "text": text,
        "language": lang,
        "sample_rate": 24000
    }).encode("utf-8")

    req = urllib.request.Request(
        "http://127.0.0.1:8001/tts",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))

    elapsed = time.time() - t0
    assert res.get("success") is True, f"TTS failed: {res}"
    provider = res.get("provider")
    model = res.get("model")
    sr = res.get("sample_rate")

    assert provider == "neural-tts", f"Wrong provider: {provider}"
    assert sr == 24000, f"Wrong sample rate: {sr}"

    b64_str = res["audio_base64"]
    wav_bytes = base64.b64decode(b64_str)
    assert len(wav_bytes) > 44, "Empty or invalid WAV"

    with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
        num_channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        wav_sr = wf.getframerate()
        num_frames = wf.getnframes()
        duration_s = round(num_frames / float(wav_sr), 2)

    assert wav_sr == 24000, f"WAV frame rate is {wav_sr}, expected 24000"
    assert num_channels == 1, f"Expected 1 channel, got {num_channels}"
    assert sample_width == 2, f"Expected 16-bit PCM (2 bytes), got {sample_width}"
    assert num_frames > 0, "Audio has 0 frames"

    print(f"  [RESULT] -> SUCCESS!")
    print(f"     Provider:    {provider}")
    print(f"     Model:       {model}")
    print(f"     Sample Rate: {wav_sr} Hz")
    print(f"     Channels:    {num_channels} (Mono)")
    print(f"     Bit Depth:   {sample_width * 8}-bit PCM")
    print(f"     Duration:    {duration_s}s ({num_frames} frames)")
    print(f"     Latency:     {elapsed * 1000:.1f} ms")
    print(f"     Payload:     {len(wav_bytes)} bytes WAV ({len(b64_str)} base64 chars)")

if __name__ == "__main__":
    print("=========================================================")
    print(" Direct Port 8001 Multilingual Neural TTS Verification")
    print("=========================================================")
    test_language("mr", "तुम्हाला काय त्रास होत आहे?")
    test_language("mr", "हा त्रास जेवल्यानंतर वाढतो का?")
    test_language("hi", "आपको क्या परेशानी हो रही है?")
    test_language("hi", "क्या यह परेशानी खाना खाने के बाद बढ़ जाती है?")
    test_language("en", "What problem are you having?")
    test_language("en", "Does this problem get worse after eating?")
    print("\n=========================================================")
    print(" ALL 3 LANGUAGES VERIFIED DIRECTLY ON PORT 8001!")
    print("=========================================================")
