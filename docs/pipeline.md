# Asset pipeline

Every image and every video frame on the site went through the same two-stage treatment so
the whole set reads as one art direction.

## 1. Video → graded frames

Source: the supplied `gemini_generated_video_*.mp4` (1280×720, 24fps, 10s).

```
GRADE="eq=contrast=1.40:brightness=-0.11:saturation=0.80:gamma=0.94,
colorbalance=rs=0.06:gs=-0.02:bs=-0.14:rm=0.05:gm=-0.01:bm=-0.10:rh=0.02:gh=-0.02:bh=-0.08,
curves=r='0/0 0.25/0.20 0.75/0.82 1/1':g='0/0 0.25/0.15 0.75/0.72 1/0.95':b='0/0 0.30/0.12 0.75/0.58 1/0.86',
vignette=angle=PI/3.6:x0=w/2:y0=h/2,
scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int,
unsharp=5:5:0.70:5:5:0.0"

# every frame of the clip — all 240, no cuts
ffmpeg -i SRC -vf "$GRADE" f_%03d.png
# then Pillow -> WebP q80 (about 64 KB a frame, 15 MB for the sequence)

# film loop: the same frames, straight through
ffmpeg -framerate 24 -i f_%03d.png -c:v libx264 -crf 19 -pix_fmt yuv420p film-loop.mp4
```

What each stage does:

| Filter | Why |
| --- | --- |
| `eq` | Drops exposure and saturation; the source is far brighter than the brand |
| `colorbalance` | Pulls blue out of shadows and mids, adds red — the amber shift |
| `curves` | Crushes blacks and rolls the blue channel off hard in the highlights |
| `vignette` | Focuses the centre, matches the reference board |
| `scale` | To 1920x1080 with Lanczos, so the browser never has to upscale again |
| `unsharp` | Recovers detail the contrast and scale passes flatten |

No grain is baked in. An earlier pass added `noise=alls=6`, which looked fine in isolation
but destroyed compression efficiency in the dark gradients — the artefacts cost far more
than the texture was worth. The page applies a CSS grain overlay instead, which is free.

**The trim matters.** The source bottle carries a *SERAPHIS LIBERTÉ* label. Outside
4.80s–6.72s it is legible. Inside that window the bottle is shattered — glass shards,
suspended droplets, then the citrus-peel spiral — and no label appears. All 48 frames were
reviewed individually on a contact sheet before being accepted.

Frames are then resized to 1280×720 and saved at JPEG q76 — 2.1 MB for the whole sequence.

## 2. Stills → graded stills

A Python/Pillow pass in the same palette:

1. **Smart crop** to the target aspect, biased toward the brightest region so the subject
   survives the crop (product shots use a centre crop instead, since the subject is centred
   and the background is the bright part).
2. **Saturation** pulled back per image.
3. **Tone map** — per-channel LUTs matching the ffmpeg curves, blended by a `warm` factor so
   images that are already on-palette aren't over-corrected.
4. **Contrast, optional gain and black-point lift.**
5. **Vignette** — radial falloff.
6. **Grain** — Gaussian, matched to the video.

Two extra corrections were applied where needed:

- **De-green.** The No. 01 bottle photograph has green bokeh. A channel operation measures
  how far green leads the other two channels per pixel and spends that excess on red,
  turning the bokeh amber without touching the glass.
- **Per-fragrance grade.** Noctis, Aurea and Vesper are the same three bottles re-graded and
  re-cropped, so the six products read as distinct objects.

Each image is written as both JPEG (q86) and WebP.

## Output

```
public/assets/
  frames/     240 × 1920×1080   15 MB   scroll sequence (WebP q80)
  video/      film-loop.mp4    8.4 MB   the full 10s clip at 1080p
  img/        ~30 stills       ~11 MB   heroes, ingredients, products, textures
```
