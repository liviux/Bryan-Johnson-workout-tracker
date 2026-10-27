# Generate native-language coach clips with Microsoft Edge neural voices.
# Usage: python3 voice/build-language-audio.py entries.json [--limit N]
# Existing clips are reused, so a text change only synthesizes new sentences.
import asyncio
import json
import os
import pathlib
import sys
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONCURRENCY = int(os.environ.get("EDGE_CONCURRENCY", "24"))


async def one(entry, voice, folder, sem):
    file = folder / f"{entry['id']}.mp3"
    if file.exists() and file.stat().st_size > 0:
        return 0
    async with sem:
        for attempt in range(6):
            tmp = folder / f"{entry['id']}.{os.getpid()}.tmp"
            try:
                communicate = edge_tts.Communicate(entry["text"], voice)
                await communicate.save(str(tmp))
                if tmp.stat().st_size == 0:
                    raise RuntimeError("empty audio")
                tmp.replace(file)
                return 1
            except Exception as err:
                try:
                    tmp.unlink(missing_ok=True)
                except OSError:
                    pass
                if attempt == 5:
                    raise RuntimeError(f"{entry['id']}: {err}") from err
                await asyncio.sleep(1.5 * (attempt + 1))
    return 0


async def main():
    payload = json.load(open(sys.argv[1], encoding="utf-8"))
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    entries = payload["entries"][:limit] if limit else payload["entries"]
    folder = ROOT / "voice/language-audio" / payload["language"] / payload["voice"]
    folder.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    done = 0
    total = len(entries)
    async def task(entry):
        nonlocal done
        made = await one(entry, payload["edge"], folder, sem)
        done += 1
        if made or done % 100 == 0:
            print(f"{payload['language']}/{payload['voice']}: {done}/{total}", flush=True)
    await asyncio.gather(*(task(entry) for entry in entries))
    print(f"{payload['language']}/{payload['voice']}: ready ({total} clips)", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
