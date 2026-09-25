# "The Cut": a 20-second history of film editing

130 years of editing told through the one thing that never changed: the cut. Each beat's own transition
uses the technique it describes: the first hard cut, a Kuleshov swap, *Breathless* jump cuts, a tape-tracking glitch,
digital pixelation, and a zoom into a phone. A red slash ends the film. The look is Saul Bass–style cut paper:
flat shapes, ragged edges that boil at 8 fps, and Bebas Neue type.

| Time | Year | Beat |
|------|------|------|
| 0–3 s | 1895 | One shot, no cuts: Lumière's train arrives in a single take |
| 3–4.3 s | 1903 | Scissors and cement: a *Great Train Robbery* shot is spliced in |
| 4.3–6.5 s | c.1920 | Kuleshov effect: face + soup = HUNGER, face + coffin = GRIEF |
| 6.5–8 s | 1924 | The Moviola |
| 8–10 s | 1960 | The jump cut (*Breathless*) |
| 10–13 s | 1970s | Videotape and timecode: source → record, IN / OUT / EDIT |
| 13–16.5 s | 1989 | Nonlinear digital: razor, drag-reorder, undo, using this film's own shots as clips |
| 16.5–18.3 s | today | Editing on a phone |
| 18.3–20 s | — | "THE CUT." gets cut |

The top-right counter tallies every cut the film itself makes.

## Files
- `scene.js`: the whole film as a pure function, `drawFrame(ctx, t)` (Canvas 2D).
- `index.html`: live preview. Space plays or pauses, the arrow keys step one frame, and `?t=8.5` freezes at a time.
- `render.mjs`: renders frames in headless Chrome (one browser per worker) and pipes lossless PNGs to ffmpeg/libx264.

## Render
Requires Node 18+, ffmpeg with libx264, and Chrome/Chromium (set `CHROME_PATH` if it is not in a standard location).

```bash
cd motion/history-of-film-editing
npm install
node render.mjs                         # → out/history-of-film-editing.mp4 (1920×1080, 60 fps, 20 s)
node render.mjs --fps 30                # faster
node render.mjs --stills 1.5,5,8.4,14.6 # PNG stills
```

Bebas Neue (`fonts/`) is under the SIL Open Font License. Monospace text uses JetBrains Mono when it is installed
and falls back to DejaVu Sans Mono.
