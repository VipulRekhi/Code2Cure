"""
Phase 5.1 Real Microphone / Acoustic Audio ASR Verification
Strictly testing genuine acoustic audio through /api/voice/asr without hints, mocks, or predefined transcripts.
"""

import os
import sys
import json
import base64
import urllib.request
import pathlib

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

cases = [
    ("mr", "माझा गुडघा दुखतोय", "backend/tests/fixtures/mr_knee_pain.wav"),
    ("mr", "मला तीन दिवसांपासून उलटी होत आहे", "backend/tests/fixtures/mr_vomiting_exact.wav"),
    ("hi", "मुझे बुखार है", "backend/tests/fixtures/hi_fever.wav"),
    ("en", "I have pain in my left knee", "backend/tests/fixtures/en_knee_pain_exact.wav"),
]

print("=" * 80)
print("PHASE 5.1 REAL ACOUSTIC AUDIO ASR VERIFICATION (ZERO HINTS / ZERO PREDEFINED TRANSCRIPTS)")
print("=" * 80)

results = []
for lang, spoken_text, file_path in cases:
    full_path = pathlib.Path(file_path).resolve()
    if not full_path.exists():
        print(f"[ERROR] Fixture file not found: {full_path}")
        continue

    audio_bytes = full_path.read_bytes()
    b64_audio = base64.b64encode(audio_bytes).decode("ascii")

    # Send payload without any hint
    payload = json.dumps({
        "audioBase64": b64_audio,
        "language": lang,
        "questionId": "q.chief_complaint",
        "sessionId": "phase-5-1-verification",
    }).encode("utf-8")

    req = urllib.request.Request(
        "http://localhost:5000/api/voice/asr",
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    transcript = data.get("data", {}).get("transcript", "")
    provider = data.get("data", {}).get("provider", "")
    confidence = data.get("data", {}).get("confidence", 0)

    print(f"Spoken Input:        '{spoken_text}' ({lang})")
    print(f"Acoustic Waveform:   {len(audio_bytes):,} bytes from {os.path.basename(file_path)}")
    print(f"Executing Provider:  {provider}")
    print(f"Returned Transcript: '{transcript}'")
    print(f"Confidence:          {confidence}")
    print("-" * 80)

    results.append({
        "spoken": spoken_text,
        "language": lang,
        "audio_bytes": len(audio_bytes),
        "provider": provider,
        "transcript": transcript,
        "confidence": confidence,
    })

# Save results for artifact reporting
with open("voice_runtime/verification_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("\nVerification data written to voice_runtime/verification_results.json")
