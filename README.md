# Philman Yeung portfolio

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it

```
cd portfolio
python3 -m http.server 8000
```

Open http://localhost:8000. Use a local server rather than double-clicking the file: the live Pretzel preview loads `pretzel.html` in a frame, and browsers block that from `file://`.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Framework preset: **Other**. Leave the build command and output directory empty (it's a static site).
3. Deploy. Every push to `main` redeploys.

`vercel.json` turns on clean URLs, so the case study lives at `/pretzel`. `pretzel.html` and `img/` are the Pretzel case study, now a page of this site.

## Files

| File | What it holds |
| --- | --- |
| `data.js` | All portfolio content and the water memories. The file you edit. |
| `index.html` | Page skeleton. |
| `styles.css` | Look and layout. Tokens at the top in `:root`. |
| `app.js` | Builds the page from `data.js`: work list, live preview, page transition, Play list. |
| `water.js` | The halftone lake (Canvas 2D). |
| `shapes.js` | Hand-traced outlines of each body of water (simplified, see the note in the file). |
| `Resume_2027_PhilmanYeung.pdf` | Your resume, linked from About. |
| `pretzel.html`, `img/` | The Pretzel 1.0 case study, grafted in unchanged except for two things listed below. |

## Updating content (`data.js`)

- **Name and tagline**: `person`.
- **About**: `introduction`.
- **Links**: `links`. Give Resume a `url`. For Email use `url: "mailto:you@example.com"` and `text: "you@example.com"`.
- **Projects**: `work[].items`. Turn a placeholder into a case study by building its page (copy how `pretzel.html` is set up), then set `status: "complete"`, `href: "your-page.html"` and `preview: { type: "page", src: "your-page.html#preview" }`.
- **Water memories**: `water.places` (grouped in Play by `region`, in list order). `last` ("YYYY-MM") sets how often rain falls there; `at`, `atNarrow`, `size`, `label` only place the outline. Outlines are in `shapes.js`, keyed by the same name.

## Changes made to the Pretzel page

1. The top-left "Philman Yeung" link now goes back to `index.html#work`.
2. A short script at the end adds a preview mode (`pretzel.html#preview`): navigation hidden, slow auto-scroll while the hover preview is showing. Without `#preview` the page behaves exactly as before.

## How the water works

- A wave equation on a grid moves the surface: rain, a wake behind the cursor, a stone where you click. Ripples reflect off the shore and fade.
- The dots carry a woven moiré texture: two fine line screens at slightly different angles, cut into and laid over the dots, drifting slowly.
- Dot size is light (swell, sun on slopes, caustics), scaled again by two moiré gratings that sit just off the dot grid's frequency, so they alias into slow, drifting interference bands.
- Colour runs indigo, cobalt, cerulean, teal, aqua and seafoam with a warm glint, on an aubergine background. The lake is a large rounded shape with a bright shoreline. Change the palette in `STOPS` at the top of `water.js`.
- Outlines are hand-traced and simplified, not survey-accurate or to scale. Motion never changes any data.
- Reduced motion: starts as a still frame with "Play motion". No JavaScript: a static dot pattern.

## Hosting on Cloudflare (free, with your own domain)

This is a static site with no build step.

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → choose this repository.
2. Build settings: Framework preset **None**, build command **empty**, build output directory **/**.
3. Deploy. You get a `*.pages.dev` address.
4. In the project → Custom domains → Set up a custom domain. If the domain's DNS is already on Cloudflare, it adds the record for you; otherwise point a CNAME at the `*.pages.dev` address.

Every push to the main branch redeploys. `pretzel.html` is also served at `/pretzel`.
