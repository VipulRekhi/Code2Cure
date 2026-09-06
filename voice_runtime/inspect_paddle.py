import os
import sys

os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["FLAGS_use_onednn"] = "0"
os.environ["FLAGS_enable_onednn"] = "0"

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import torch
import paddle
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_textline_orientation=True, lang='hi', enable_mkldnn=False)
res = ocr.predict('test_devanagari.png')

print("=== PADDLEOCR RAW RECOGNITION OUTPUT ===")
for r in res:
    rec_texts = r.get('rec_texts', [])
    rec_scores = r.get('rec_scores', [])
    for text, score in zip(rec_texts, rec_scores):
        print(f"Recognized: {repr(text)} | Score: {score:.3f} | CodePoints: {[ord(c) for c in text]}")
