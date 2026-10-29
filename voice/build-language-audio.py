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
CONCURRENCY = int(os.environ.get("EDGE_CONCURRENCY", "12"))


async def one(entry, voice, folder, sem):
    file = folder / f"{entry['id']}.mp3"
    if file.exists() and file.stat().st_size > 0:
        return 0
    async with sem:
        for attempt in range(10):
            tmp = folder / f"{entry['id']}.{os.getpid()}.tmp"
            try:
                communicate = edge_tts.Communicate(entry["text"], voice, connect_timeout=10, receive_timeout=10)
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
                if attempt == 9:
                    print(f"{voice}: skipped {entry['id']} after {err}", flush=True)
                    return -1
                # Rate limits and transient empty responses need a longer pause
                # than a real input error; the quadratic cap keeps jobs moving.
                await asyncio.sleep(min(30, 1.5 * (attempt + 1) ** 2))
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
    failed = 0
    total = len(entries)
    async def task(entry):
        nonlocal done, failed
        made = await one(entry, payload["edge"], folder, sem)
        if made < 0:
            failed += 1
        done += 1
        if made or done % 100 == 0:
            print(f"{payload['language']}/{payload['voice']}: {done}/{total}", flush=True)
    await asyncio.gather(*(task(entry) for entry in entries))
    if failed:
        print(f"{payload['language']}/{payload['voice']}: {failed} clip(s) still missing; run the builder again", flush=True)
        sys.exit(1)
    print(f"{payload['language']}/{payload['voice']}: ready ({total} clips)", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
