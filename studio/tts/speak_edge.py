"""Free narration via Microsoft Edge TTS (edge-tts, no API key). Usage: speak_edge.py <out.mp3> <voice> <speed>  (text on stdin)
Same contract as speak.py so callers can pick either engine. Voices are the neural Edge ones,
e.g. vi-VN-HoaiMyNeural (VI female), vi-VN-NamMinhNeural (VI male), en-US-AriaNeural, …"""
import asyncio
import re
import sys

import edge_tts


def main():
    out, voice, speed = sys.argv[1], sys.argv[2], float(sys.argv[3])
    text = sys.stdin.buffer.read().decode("utf-8")
    text = re.sub(r"\[[^\]]*\]", " ", text)  # drop tvhead [direction] tags
    text = re.sub(r"\s+", " ", text).strip()
    rate = f"{int(round((speed - 1) * 100)):+d}%"  # 1.0 -> +0%, 1.1 -> +10%, 0.9 -> -10%

    async def go():
        await edge_tts.Communicate(text, voice, rate=rate).save(out)

    asyncio.run(go())


if __name__ == "__main__":
    main()
