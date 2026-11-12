"""Local, free narration with Kokoro (Apache-2.0). Usage: speak.py <out.mp3> <voice> <speed>  (text on stdin)"""
import os
import re
import shutil
import subprocess
import sys

import espeakng_loader

# espeak-ng can't open its data under a non-ASCII path (e.g. a user name with an accent), so keep a copy in an ASCII-only folder.
# (Windows only; on macOS/Linux the bundled paths are used as they are.)
if os.name == "nt":
    ASCII_DIR = os.path.join(os.environ.get("PUBLIC", "C:/Users/Public"), "tvhead-espeak")
    DATA = os.path.join(ASCII_DIR, "espeak-ng-data")
    LIB = os.path.join(ASCII_DIR, "espeak-ng.dll")
    if not os.path.exists(os.path.join(DATA, "phontab")):
        shutil.copytree(espeakng_loader.get_data_path(), DATA, dirs_exist_ok=True)
    if not os.path.exists(LIB):
        shutil.copy2(espeakng_loader.get_library_path(), LIB)
else:
    DATA, LIB = espeakng_loader.get_data_path(), espeakng_loader.get_library_path()
os.environ["ESPEAK_DATA_PATH"] = DATA
os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = LIB

import soundfile as sf  # noqa: E402
from kokoro_onnx import Kokoro  # noqa: E402
from kokoro_onnx.config import EspeakConfig  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    out, voice, speed = sys.argv[1], sys.argv[2], float(sys.argv[3])
    text = sys.stdin.buffer.read().decode("utf-8")
    text = re.sub(r"\[[^\]]*\]", " ", text)  # drop tvhead [direction] tags
    text = re.sub(r"\s+", " ", text).strip()
    k = Kokoro(
        os.path.join(HERE, "kokoro-v1.0.onnx"),
        os.path.join(HERE, "voices-v1.0.bin"),
        espeak_config=EspeakConfig(lib_path=LIB, data_path=DATA),
    )
    samples, rate = k.create(text, voice=voice, speed=speed, lang="en-us")
    wav = out + ".wav"
    sf.write(wav, samples, rate)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-c:a", "libmp3lame", "-q:a", "2", out], check=True)
    os.remove(wav)


if __name__ == "__main__":
    main()
