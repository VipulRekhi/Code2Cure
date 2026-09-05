import sys
import pkg_resources

installed = {pkg.key: pkg.version for pkg in pkg_resources.working_set}
print("Python:", sys.version)
for name in ["torch", "torchaudio", "transformers", "fairseq", "f5-tts", "indic-f5", "speechrecognition", "edge-tts"]:
    print(f"{name}: {installed.get(name, 'NOT INSTALLED')}")
