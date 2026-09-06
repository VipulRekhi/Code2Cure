"""
Medical Document OCR Runtime (PaddleOCR Devanagari + English)
Provides:
1. Standalone CLI interface with strict UTF-8 JSON streaming on stdout
2. Library function `process_image(image_path_or_bytes)` for HTTP server and scripts
3. Seamless support for JPG, PNG, WEBP, and PDF documents (via pypdfium2)
Zero hallucination: only recognized text is returned.
"""

import os
import sys
import io
import json
import base64
import warnings
import contextlib
import cv2
import numpy as np

# Suppress library warnings and disable oneDNN/mkldnn quirks
warnings.filterwarnings("ignore")
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["FLAGS_use_onednn"] = "0"
os.environ["FLAGS_enable_onednn"] = "0"
os.environ["PADDLE_DISABLE_WARNINGS"] = "1"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

@contextlib.contextmanager
def redirect_stdout_to_stderr():
    """Redirects stdout to stderr during noisy library calls to keep stdout pure JSON."""
    old_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        yield
    finally:
        sys.stdout = old_stdout

# Global cached OCR engine
_OCR_ENGINE = None

def get_ocr_engine():
    global _OCR_ENGINE
    if _OCR_ENGINE is None:
        with redirect_stdout_to_stderr():
            import torch
            import paddle
            from paddleocr import PaddleOCR
            # lang='hi' loads the devanagari_PP-OCRv5 model which recognizes Marathi, Hindi & English
            _OCR_ENGINE = PaddleOCR(use_textline_orientation=True, lang="hi", enable_mkldnn=False)
    return _OCR_ENGINE

def _extract_pages_as_images(image_input) -> list:
    """
    Decodes input (bytes or filepath) into a list of BGR numpy image arrays.
    Supports JPG, PNG, WEBP, and multi-page PDF documents.
    """
    is_bytes = isinstance(image_input, (bytes, bytearray))
    is_path = isinstance(image_input, str)

    if not is_bytes and not is_path:
        return []

    # Detect PDF format
    is_pdf = False
    if is_bytes and len(image_input) >= 4 and image_input[:4] == b"%PDF":
        is_pdf = True
    elif is_path and os.path.exists(image_input):
        lower = image_input.lower()
        if lower.endswith(".pdf"):
            is_pdf = True
        else:
            try:
                with open(image_input, "rb") as f:
                    header = f.read(4)
                if header == b"%PDF":
                    is_pdf = True
            except Exception:
                pass

    if is_pdf:
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(image_input)
            images = []
            for i, page in enumerate(pdf):
                if i >= 2:
                    break
                # Render at 1.0x scale (standard crisp document DPI)
                pil_img = page.render(scale=1.0).to_pil()
                bgr_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                images.append(bgr_img)
            return images
        except Exception as e:
            sys.stderr.write(f"[OCR Runtime] PDF rendering error: {e}\n")
            return []

    # Standard image decoding
    if is_bytes:
        nparr = np.frombuffer(image_input, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return [img] if img is not None else []
    else:
        if not os.path.exists(image_input):
            return []
        img = cv2.imread(image_input, cv2.IMREAD_COLOR)
        return [img] if img is not None else []

def process_image(image_input) -> dict:
    """
    Takes either a file path (str) or raw image/pdf bytes (bytes).
    Performs safe copy-based enhancement and PaddleOCR recognition.
    Returns structured dict with exact Unicode text.
    """
    if isinstance(image_input, (bytes, bytearray)):
        if len(image_input) < 32:
            return {
                "success": False,
                "error": "EMPTY_OR_CORRUPT_FILE",
                "message": "Uploaded file is empty or too small.",
                "ocrText": "",
                "confidence": 0.0,
                "processingStatus": "FAILED",
            }
    elif isinstance(image_input, str):
        if not os.path.exists(image_input) or os.path.getsize(image_input) < 32:
            return {
                "success": False,
                "error": "EMPTY_OR_CORRUPT_FILE",
                "message": "File does not exist or is empty.",
                "ocrText": "",
                "confidence": 0.0,
                "processingStatus": "FAILED",
            }
    else:
        return {
            "success": False,
            "error": "INVALID_INPUT_TYPE",
            "message": "Expected file path or bytes.",
            "ocrText": "",
            "confidence": 0.0,
            "processingStatus": "FAILED",
        }

    page_images = _extract_pages_as_images(image_input)
    if not page_images:
        return {
            "success": False,
            "error": "INVALID_IMAGE_DATA",
            "message": "Could not decode image or PDF format.",
            "ocrText": "",
            "confidence": 0.0,
            "processingStatus": "FAILED",
        }

    ocr = get_ocr_engine()

    all_lines = []
    all_text_lines = []
    all_confidences = []

    for img in page_images:
        if img is None:
            continue
        h, w = img.shape[:2]
        if min(h, w) < 32:
            continue

        # Safe enhancement on a copy (scale small images up, cap huge camera images to 1200px)
        if max(h, w) < 800:
            scale = 800.0 / max(h, w)
            img_proc = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
        elif max(h, w) > 1200:
            scale = 1200.0 / max(h, w)
            img_proc = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        else:
            img_proc = img.copy()

        with redirect_stdout_to_stderr():
            results = ocr.predict(img_proc)

        for page in results:
            rec_texts = page.get("rec_texts", [])
            rec_scores = page.get("rec_scores", [])
            rec_boxes = page.get("rec_boxes", [])
            for text, score, box in zip(rec_texts, rec_scores, rec_boxes):
                clean_text = text.strip()
                if clean_text:
                    box_list = box.tolist() if hasattr(box, "tolist") else box
                    all_lines.append({
                        "text": clean_text,
                        "confidence": round(float(score), 4),
                        "box": box_list,
                    })
                    all_text_lines.append(clean_text)
                    all_confidences.append(float(score))

    full_ocr_text = "\n".join(all_text_lines).strip()
    avg_conf = round(float(np.mean(all_confidences)), 4) if all_confidences else 0.0

    if not full_ocr_text or len(full_ocr_text) < 5 or avg_conf < 0.25:
        return {
            "success": False,
            "error": "UNREADABLE_DOCUMENT",
            "message": "We couldn't read this document clearly. Please try another image.",
            "ocrText": full_ocr_text,
            "confidence": avg_conf,
            "lines": all_lines,
            "processingStatus": "FAILED",
        }

    return {
        "success": True,
        "ocrText": full_ocr_text,
        "confidence": avg_conf,
        "lines": all_lines,
        "processingStatus": "PROCESSED",
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}, ensure_ascii=False))
        sys.exit(1)

    target_file = sys.argv[1]
    res = process_image(target_file)
    # Output cleanly on standard stdout buffer as pure UTF-8
    out_bytes = (json.dumps(res, ensure_ascii=False) + "\n").encode("utf-8")
    sys.stdout.buffer.write(out_bytes)
    sys.stdout.buffer.flush()
