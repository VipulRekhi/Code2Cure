"""
Real Acoustic Audio ASR Test for Phase 5.1 Verification
Tests genuine acoustic audio playback through /api/voice/asr without any hints, mocks, or predefined strings.
"""

import sys
import json
import base64
import asyncio
import urllib.request
import edge_tts

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

test_cases = [
    ("mr", "माझा गुडघा दुखतोय", "mr-IN-AarohiNeural"),
    ("mr", "मला तीन दिवसांपासून उलटी होत आहे", "mr-IN-AarohiNeural"),
    ("hi", "मुझे बुखार है", "hi-IN-SwaraNeural"),
    ("en", "I have pain in my left knee", "en-IN-NeerjaNeural"),
]

async def run_test():
    print("=" * 65)
    print("REAL ACOUSTIC AUDIO ASR TEST (ZERO HINTS, ZERO PREDEFINED TRANSCRIPTS)")
    print("=" * 65)
    
    results = []
    for lang, sentence, voice in test_cases:
        # 1. Synthesize real acoustic audio waveform bytes
        comm = edge_tts.Communicate(sentence, voice)
        chunks = []
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        real_audio_bytes = b"".join(chunks)
        b64_audio = base64.b64encode(real_audio_bytes).decode("ascii")

        # 2. Send real audio bytes to Express endpoint WITHOUT ANY HINT
        payload = json.dumps({
            "audioBase64": b64_audio,
            "language": lang,
            "questionId": "q.chief_complaint",
            "sessionId": "real-test-session",
            # Explicitly NO hint field
        }).encode("utf-8")

        req = urllib.request.Request(
            "http://localhost:5000/api/voice/asr",
            data=payload,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            
            transcript = data.get("data", {}).get("transcript", "")
            provider = data.get("data", {}).get("provider", "unknown")
            confidence = data.get("data", {}).get("confidence", 0)

            print(f"Spoken Input:    '{sentence}' ({lang})")
            print(f"Audio Payload:   {len(real_audio_bytes)} real acoustic bytes")
            print(f"ASR Provider:    {provider}")
            print(f"ASR Transcript:  '{transcript}'")
            print(f"Confidence:      {confidence}")
            print("-" * 65)
            
            results.append({
                "spoken": sentence,
                "language": lang,
                "transcript": transcript,
                "provider": provider,
                "bytes": len(real_audio_bytes)
            })
        except Exception as e:
            print(f"FAILED for '{sentence}': {e}")
            results.append({"spoken": sentence, "error": str(e)})

    return results

if __name__ == "__main__":
    asyncio.run(run_test())
