# Filmstrip loop — motion as code

A 20-second, seamlessly looping 1920×1080 animation in a mid-century storybook style: an orange
film-reel mascot with rubber-hose limbs rides a scrolling 35mm filmstrip through four eras.

| Time | Era | Paper | Action |
|------|-----|-------|--------|
| 0–5 s | 1920s | mustard | snips B&W celluloid with brass scissors; a hand-cranked camera rolls |
| 5–10 s | 1960s | denim | Godard shades on, hops over each taped jump-cut splice (flip on the 3rd) |
| 10–15 s | 1990s | seafoam | taps a chunky CRT, clips snap onto the edit timeline |
| 15–20 s | Today | navy | bows beside a cursive **fin.** badge, then hops back to 1920 |

## Stack

- `scene.js`: the entire animation as one pure function, `drawFrame(ctx, t)`, drawn with Canvas 2D.
  It has no state and no clock, so any frame can be rendered on its own, in any order.
  Every periodic motion completes a whole number of cycles in 20 s, and the eras hand over at
  0/5/10/15 s with an iris wipe. That makes frame 1200 identical to frame 0.
- `index.html`: live preview in any browser (open it through a static server, e.g.
  `npx serve .`). Space toggles play/pause, the arrow keys step one frame, and `?t=12.4` freezes at a time.
- `render.mjs`: opens the page in headless Chrome (puppeteer-core), grabs lossless PNG frames from
  several tabs in parallel, and pipes them in order into ffmpeg/libx264.

## Render

Requires Node 18+, ffmpeg with libx264, and Chrome/Chromium (set `CHROME_PATH` if it is not in a standard location).

```bash
cd motion/filmstrip-loop
npm install
node render.mjs                      # → out/filmstrip-loop.mp4 (60 fps, 1200 frames, H.264 yuv420p)
node render.mjs --fps 30 --workers 4 # faster
node render.mjs --stills 2.3,7.3,12.4,16.9   # PNG stills at given times (out/filmstrip-loop-t*.png)
```

Check the loop and length:

```bash
ffprobe -v error -count_frames -show_entries stream=nb_read_frames,r_frame_rate,duration out/filmstrip-loop.mp4
ffplay -loop 0 out/filmstrip-loop.mp4
```

## Fonts

`fonts/` holds Pacifico ("fin.", "snip!") and Alfa Slab One (era labels), both under the SIL Open Font
License, from [google/fonts](https://github.com/google/fonts). Monospace annotations use JetBrains Mono
when it is installed and fall back to DejaVu Sans Mono.
