# Team Francisco — Weekend Graphic Builder

Single-page tool for making a weekly social graphic of a youth baseball
player's weekend stats. Two formats, chosen in the Layout tab: **Post 4:5**
(1024×1280, the default — the tallest shape Instagram shows uncropped in the
feed) and **Poster 2:3** (1024×1536, the original print proportion).
Owner: Jonathan (product designer — expect precise visual feedback).
Hosted target: Vercel, repo `thvibe/tf-weekend-builder`.

## Current state
- Everything lives in `index.html` (~1.2 MB). Images are base64 data URIs in
  constants at the top of the `<script>`: `PH_A`, `PH_B` (default photos),
  `GRUNGE` (texture), `LOGO` (TF mark), `BRUSH` (banner brush alpha mask),
  `ORIG` (the full "Original" poster backdrop with stat panels removed).
- All rendering is canvas 2D. Font: Oswald, self-hosted from `public/fonts/`
  (one variable woff2 per unicode range), with an Arial Narrow fallback. It is
  deliberately not loaded from Google Fonts: the canvas measures every string
  to lay itself out, so a font that fails to arrive does not degrade the
  poster, it changes it — Arial Narrow runs about 23% wider than Oswald.
- No build step, no dependencies.

## First tasks
1. Split `index.html` into `index.html`, `app.js`, `styles.css`, and move the
   base64 images to real files in `/public` (jpg/png). Keep behaviour identical.
2. Commit, push to `main`, confirm the Vercel deploy works.
3. Take a screenshot of each layout and check for text overlap/clipping.

## Brand rules (do not break)
- Brand is black and white. **Black & White mode is the default on load.**
- The TF logo must never be altered, recoloured, or redrawn. Use the logo asset as-is.
- Uploaded photos are never recoloured (skin tones must stay true). The only
  exception: B&W mode converts photos to grayscale.
- Accent colour recolours artwork, backgrounds, grunge texture, splatter,
  borders, header bars — never photos, never the logo.

## Layouts
- **Original family** (Jonathan's favourite — keep these): `original`,
  `origTall`, `origCompact`, `origSplit`, `origBanner`, `origLine`.
  Draw the `ORIG` plate full-bleed, then the stat stack in a left column at
  x=35, width=601, starting at y=748 (running to 1348 at 2:3, 1146 at 4:5).
  The plate is baked at 2:3, so at 4:5 it is scaled to the width and anchored
  at the top — which crops its baked footer bar, and `footer()` draws instead.
  These cannot mirror (type is baked into the plate) — Flip and Photo-border
  toggles are disabled for them.
- **Generic layouts** (`columns`, `topPhoto`, `bottomPhoto`, `hero`,
  `spotlight`, `band`): Jonathan was lukewarm on these. He intends to choose
  which to keep — don't delete without asking. These support Flip; header puts
  the large logo on one side and the headline in the opposite top corner.

## Stat stack sizing (hard-won — preserve the logic)
- Sections: `team`, `hdr` (player header bar), `rate` (3 cells), `ban`
  (brush banner), `cnt` (4 counting stats: big value + small suffix label).
- Team Results and Rate Stats must share ONE value size and ONE label size
  (`baseType()`), computed from the rate row and checked against the 2-up team box.
- Within any row, all cells use the size of the tightest cell (so `.833` is not
  bigger than `1.833`).
- Box heights are derived FROM the type size (`cap + label + PAD_V`), so boxes
  hug content. `PAD_V = 44` → ~18px above value, 8px between, 18px below label.
- `fit()` applies a modest vertical stretch `SC`, then spends leftover space on
  gaps between boxes (`GX`), never on inflating boxes. `S(n)` = n × SC.
  Past bug: dividing by SC before `S()` cancelled the scale and caused overflow.
- All text is width-fitted (`txtFit`, `fitRatio`) — nothing may overlap a
  divider or panel edge.

## Editor UI
- Poster always visible; controls in a bottom drawer with icon tabs
  (Layout, Photos, Color, Text, Team, Player, Stats, Save, Hide).
- Highlight-a-box: user picks one container and a fill colour; text flips
  black/white by luminance.
- Save: tries `claude.use("downloads")` (Claude artifact host), falls back to a
  normal `<a download>` when self-hosted.
