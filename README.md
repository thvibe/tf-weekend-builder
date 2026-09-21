# tf-weekend-builder

Team Francisco — Weekend Graphic Builder. A single-page tool for making a
weekly 1024×1536 social graphic of a youth baseball player's weekend stats.

## Layout of the repo

| Path | What it is |
| --- | --- |
| `index.html` | Markup only — the canvas stage and the bottom control drawer. |
| `styles.css` | All editor UI styling. |
| `app.js` | All rendering and control logic (canvas 2D). |
| `public/` | Image assets, previously inlined as base64 data URIs. |
| `vercel.json` | Pins the deploy to a plain static site rooted at the repo. |

Assets in `public/`: `photo-a.jpg`, `photo-b.jpg` (default photos),
`grunge.jpg` (texture), `logo.png` (TF mark), `brush.png` (banner brush alpha
mask), `original-plate.jpg` (the "Original" poster backdrop).

No build step and no dependencies. Font is Oswald (Google Fonts) with an
Arial Narrow fallback.

## Running it locally

Serve the directory over HTTP — do **not** open `index.html` from the
filesystem:

```sh
python3 -m http.server 8000
# then open http://127.0.0.1:8000/
```

The renderer calls `getImageData()` to recolour the artwork and to convert
photos to grayscale in B&W mode. Over `file://`, Chrome treats every image as
cross-origin and taints the canvas, so those calls throw and the poster fails
to draw. Over HTTP the assets are same-origin and everything works. (This was
not an issue while the images were base64 data URIs.)

## Deploying

Vercel, as a static site with no build command. `vercel.json` sets
`outputDirectory` to `.` so that the repo root is published — without it,
Vercel's zero-config static detection would treat `public/` as the output
directory and the site would 404.
