"""Bizzing Maths narration: the family narrator, recorded once, played on the device.

    GKEY=$(cat /root/.gkey2) python3 tools/voice/tts.py            record what is missing, lint, write the manifest
    python3 tools/voice/tts.py --lint                              measure every clip on disk; rewrite the manifest
    GKEY=... python3 tools/voice/tts.py --only k1,k2 --force       re-record exactly these keys
    python3 tools/voice/tts.py --dry-run                           say what would be recorded, record nothing
    python3 tools/voice/tts.py --prune                             delete clips on disk that nothing asks for

The clip list is not kept here. `node tools/voice/clips.mjs` asks the app for it
(questions from the generators a 6-8-year-old meets, the fixed lines from the
modules that show them), so it cannot drift from what the player will look up.

Family standard: en-IN-Chirp3-HD-Laomedeia at speakingRate 1.02, MP3, mono,
24 kHz. Each clip is trimmed of the silence the synthesiser pads it with (a
question is a chain of pieces, and half a second of air between "seven" and
"plus" is a stammer) and brought to one loudness, so pieces from different
calls sit together.

THE TWO WAYS THIS GOES WRONG QUIETLY, both paid for in Bizzing India:
  * the API can answer 200 OK with an empty or silent MP3. Every clip is
    measured (ffmpeg volumedetect): mean volume below -20 dB or shorter than
    0.35 s is REJECTED and left out of the manifest, so the player falls back
    to the device voice instead of playing silence.
  * a failed re-record leaves the OLD file on disk, which looks fine. Every clip
    this run meant to write and whose mtime predates the run is reported as
    STALE and left out of the manifest.

The key is read from the GKEY environment variable and never printed, logged
or written anywhere. Chirp3-HD is a premium tier with a small per-minute quota:
four workers, not eight (Bizzing India lost 84 of 565 clips to eight).
"""
import base64, concurrent.futures as cf, json, os, re, shutil, subprocess, sys, tempfile, threading, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
APP = os.path.join(ROOT, 'app')
OUT = os.path.join(APP, 'public', 'voice')
MANIFEST = os.path.join(APP, 'src', 'voice-manifest.js')

VOICE = {'languageCode': 'en-IN', 'name': 'en-IN-Chirp3-HD-Laomedeia'}
RATE = 1.02
FLOOR_DB = -20.0     # mean volume
FLOOR_SEC = 0.35
TARGET_DB = -16.0    # mean loudness every clip is brought to
LEAD_S, TAIL_S = 0.04, 0.10


def ffmpeg():
    exe = os.environ.get('FFMPEG') or shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('ffmpeg not found: install it, set FFMPEG, or pip install imageio-ffmpeg')


FF = None


def measure(path, filt=''):
    """(mean_dB, max_dB, seconds) of the decoded audio. Unreadable reads as silent."""
    af = (filt + ',' if filt else '') + 'volumedetect'
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', path, '-af', af, '-f', 'null', '-'],
                       capture_output=True, text=True)
    last = lambda pat: (re.findall(pat, r.stderr) or [None])[-1]   # volumedetect reports twice; the last is the stream
    mean, mx, n, rate = last(r'mean_volume: (-?[\d.]+) dB'), last(r'max_volume: (-?[\d.]+) dB'), last(r'n_samples: (\d+)'), last(r'(\d+) Hz')
    secs = int(n) / int(rate) if n and rate else 0.0
    return (float(mean) if mean else -99.0), (float(mx) if mx else -99.0), secs


TRIM = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=%.2f,'
        'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=%.2f,areverse') % (LEAD_S, TAIL_S)


COMP = 'acompressor=threshold=-24dB:ratio=4:attack=3:release=60'


def finish(raw, dest):
    """Trim the padding, even out the peaks, level the loudness, encode small.
    Speech peaks sit ~17 dB above its mean, so without the compressor no gain can
    lift the mean without clipping; with it, every piece lands near -16 dB and
    "seven" is as loud as the "plus" after it. Write whole, then move."""
    mean, mx, _ = measure(raw, TRIM + ',' + COMP)
    gain = max(-6.0, min(18.0, TARGET_DB - mean, -1.0 - mx)) if mean > -90 else 0.0
    tmp = dest + '.part.mp3'
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', '-i', raw,
                    '-af', '%s,%s,volume=%.2fdB' % (TRIM, COMP, gain),
                    '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '32k', tmp], check=True)
    m2, _, s2 = measure(tmp)
    if m2 < FLOOR_DB or s2 < FLOOR_SEC:
        os.unlink(tmp)
        raise ValueError('lint: mean %.1f dB, %.2f s' % (m2, s2))   # silent or truncated: record it again
    os.replace(tmp, dest)


def synth(text, key):
    body = json.dumps({'input': {'text': text}, 'voice': VOICE,
                       'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': RATE, 'sampleRateHertz': 24000}}).encode()
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + key,
                                 data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return base64.b64decode(json.load(r)['audioContent'])


def clip_list():
    r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'voice', 'clips.mjs')], capture_output=True, text=True, cwd=ROOT)
    if r.stderr.strip():
        print(r.stderr.strip(), file=sys.stderr)
    if r.returncode:
        sys.exit('clips.mjs failed')
    return json.loads(r.stdout)


def lint(keys, workers=8):
    """key -> (ok, mean, secs) for every key with a file on disk."""
    def one(k):
        mean, _, secs = measure(os.path.join(OUT, k + '.mp3'))
        return k, (mean >= FLOOR_DB and secs >= FLOOR_SEC, mean, secs)
    have = [k for k in keys if os.path.exists(os.path.join(OUT, k + '.mp3'))]
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        return dict(ex.map(one, have))


def write_manifest(entries):
    lines = ['/* voice-manifest.js — GENERATED by tools/voice/tts.py. Do not edit.',
             '   key (voice-text.js keyOf) -> { f: file in public/voice/, d: seconds }.',
             '   Only clips that are on disk, passed the lint and were not left stale. */',
             'export const VOICE = {']
    for k in sorted(entries):
        lines.append('  %s: { f: %s, d: %s },' % (json.dumps(k), json.dumps(k + '.mp3'), ('%.2f' % entries[k])))
    lines.append('};')
    with open(MANIFEST + '.part', 'w') as f:
        f.write('\n'.join(lines) + '\n')
    os.replace(MANIFEST + '.part', MANIFEST)


def main(argv):
    global FF
    FF = ffmpeg()
    workers = int(argv[argv.index('--workers') + 1]) if '--workers' in argv else 4
    only = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None
    force, dry, lint_only, prune = '--force' in argv, '--dry-run' in argv, '--lint' in argv, '--prune' in argv
    if force and not only:
        print('!! --force without --only: re-recording EVERY clip.', flush=True)

    clips = clip_list()
    by_key = {c['k']: c for c in clips}
    os.makedirs(OUT, exist_ok=True)
    on_disk = {f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3')}
    orphans = sorted(on_disk - set(by_key))

    todo = [] if lint_only else [c for c in clips
                                 if (only is None or c['k'] in only)
                                 and (force or c['k'] not in on_disk)]
    print('clips %d · on disk %d · to record %d · orphans %d' % (len(clips), len(on_disk & set(by_key)), len(todo), len(orphans)), flush=True)
    if dry:
        for c in todo[:40]:
            print('  would record', c['k'], repr(c['text']))
        return

    started = time.time()
    fail, done, lock = [], [0], threading.Lock()
    if todo:
        key = os.environ.get('GKEY', '').strip()
        if not key:
            sys.exit('GKEY is not set (GKEY=$(cat /root/.gkey2) python3 tools/voice/tts.py)')

        def one(c):
            for attempt in range(5):
                try:
                    audio = synth(c['text'], key)
                    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as t:
                        t.write(audio)
                    try:
                        finish(t.name, os.path.join(OUT, c['k'] + '.mp3'))
                    finally:
                        os.unlink(t.name)
                    with lock:
                        done[0] += 1
                        if done[0] % 50 == 0:
                            print('  ...', done[0], '/', len(todo), flush=True)
                    return
                except Exception as e:     # noqa: BLE001 — retried, then reported loudly
                    if attempt < 4:
                        time.sleep(2 ** attempt + 1)
                        continue
                    detail = getattr(e, 'code', '') or str(e)[:60] or type(e).__name__
                    with lock:
                        fail.append(c['k'])
                        print('FAIL', c['k'], detail, repr(c['text'][:60]), flush=True)
        with cf.ThreadPoolExecutor(max_workers=workers) as pool:
            list(pool.map(one, todo))

    # stale: meant to be written this run, but the file on disk is older than the run
    stale = sorted(c['k'] for c in todo if os.path.exists(os.path.join(OUT, c['k'] + '.mp3'))
                   and os.path.getmtime(os.path.join(OUT, c['k'] + '.mp3')) < started)
    res = lint(list(by_key))
    bad = sorted((k, m, s) for k, (ok, m, s) in res.items() if not ok)
    entries = {k: s for k, (ok, m, s) in res.items() if ok and k not in stale}
    write_manifest(entries)

    if prune and orphans:
        for k in orphans:
            os.remove(os.path.join(OUT, k + '.mp3'))
        print('pruned %d orphan clips' % len(orphans))
    elif orphans:
        print('%d clips on disk that nothing asks for (run with --prune to delete): %s' % (len(orphans), ' '.join(orphans[:12])))
    for k, m, s in bad:
        print('REJECTED %s mean %.1f dB, %.2f s — %r' % (k, m, s, by_key[k]['text'][:60]))
    for k in stale:
        print('STALE %s still holds audio from before this run' % k)
    missing = [k for k in by_key if k not in res]
    size = sum(os.path.getsize(os.path.join(OUT, k + '.mp3')) for k in entries)
    print('DONE recorded=%d failed=%d rejected=%d stale=%d missing=%d manifest=%d (%.2f MB)'
          % (done[0], len(fail), len(bad), len(stale), len(missing), len(entries), size / 1048576))
    if fail or bad or stale or missing:
        sys.exit(1)


if __name__ == '__main__':
    main(sys.argv[1:])
