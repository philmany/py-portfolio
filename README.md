# Philman Yeung portfolio

Live at [philmanyeung.com](https://philmanyeung.com). Plain HTML, CSS and JavaScript: no build step, no dependencies.

## Run and deploy

```
cd py-portfolio
npx wrangler pages dev .
```

Use Wrangler, not a plain static server, so clean URLs, `_redirects` and `404.html` behave like production.

Production is the Cloudflare Worker `py-portfolio` (static assets only), deployed from `main`. Settings live in `wrangler.jsonc`; `.assetsignore` keeps repo files like this README off the site. Domain is registered at Porkbun.

- Clean URLs: `about.html` serves at `/about`, `photography.html` at `/photography`, `work/pretzel.html` at `/work/pretzel`.
- `_redirects`: old `/pretzel` and `/pretzel.html` 301 to `/work/pretzel`.
- `404.html` serves any missing URL with a real 404.
- SEO: `sitemap.xml`, `robots.txt`, `llms.txt`, Person schema. `llms.txt` is listed in the sitemap, noted in `robots.txt` and linked from each page's `<head>`. Add each new case study to `sitemap.xml` and `llms.txt`.
- Keep Cloudflare SSL/TLS > Always Use HTTPS on.
- Old trial copy: philmany.github.io/py-portfolio (retire via Settings > Pages > Unpublish).

## Files

| File | What it holds |
| --- | --- |
| `data.js` | All content: tagline, work, play, brands, links, water memories. The file you edit. |
| `index.html`, `about.html` | Home and About pages. |
| `photography.html`, `photography.js`, `photos/` | Caurinus Photography (Play): seamless masonry grid with a Shuffle button (random order, photos the visitor hasn't seen this visit come first; tracked in `sessionStorage`) and a full-screen viewer (arrows, swipe). Photos are WebP, `-sm` for the grid and `-lg` for the viewer, with all metadata stripped (EXIF, GPS, XMP, colour profiles). `#preview` hides navigation and auto-scrolls for the hover preview. |
| `tokens.css` | Design tokens and `@font-face`, copied verbatim from [`philmany/py-potfolio-design-system`](https://github.com/philmany/py-potfolio-design-system), the design source of truth. Edit there, not here. |
| `styles.css` | Look and layout, built only from tokens. |
| `motion.js` | Site-wide Pause motion: any `[data-motion-toggle]` button toggles `html.motion-paused` (remembered across pages); scripts read `Motion.paused()`. |
| `fonts/` | Self-hosted WOFF2: ZT Nature (body) and PP Museum (headings). |
| `app.js`, `about.js` | Build each page from `data.js`: work list, hover previews, Play list, reveals. `app.js` also runs the demo fish that swims up to Microsoft Advertising to show the hover preview (on "View my Work", or after 1s in view with no hover). |
| `water.js` | The hero lake: 2.5D halftone dots printed as a two-ink riso (teal + orange) with moiré line screens, plus each memory as a patch of lit dots in the same grid. Hover calms the lake; click reveals the outline and photo. Tempo, calm, dot opacity and density are constants at the top; palette in `STOPS`. |
| `flow.js` | Page transition: a click goes straight to the next page, which loads under the riso water; an opening spreads from where you clicked and reveals it. Also prefetches pages on hover. |
| `rolodex.js` | Flipping text in the hero tagline and closing heading. |
| `shapes.js` | Water outlines (Natural Earth / GSHHG data or traced from maps; not to scale). They shape each lit dot patch and are drawn as outlines once a memory is opened. |
| `heron.js` | Dot-drawn fish and heron in About: hover the fish and the heron swoops. |
| `sound.js` | Generated wave sound, starts muted. |
| `memories/`, `about/`, `previews/`, `logos/` | Memory snapshots, About portrait and the two sketches pasted on it, screenshot previews for outside sites, brand logos. |
| `logo.svg` | Header brand on every page: the crayon "PHILMAN" wordmark, traced to a white SVG with the grain kept. |
| `work/pretzel.html`, `img/` | Pretzel 1.0 case study for Snack, built on the py design system in Snack's dark theme. |
| `Resume_2027_PhilmanYeung.pdf` | Resume, linked from About. |

## Editing `data.js`

- **Booking** (`person.bookingUrl`): the hero's Let’s Build Together button (Calendly, new tab). Remove the field to hide the button.
- **Rolodex text** (`person.tagline`, `introduction`): `{A|B|C}` flips through options, `{word}` accents, `{year}` is the current year. Speed is set by `taglineSpeed` / `introductionSpeed` (ms).
- **Work and Play**: `work[].items`, `play[].items`. Outside sites use `href` plus `preview: { type: "image", src: "previews/..." }`.
- **New photos**: export without metadata isn't enough on its own; re-encode to `photos/pNN-sm.webp` (900px long edge) and `-lg.webp` (2000px) from raw pixels, then add a `<li>` to `photography.html`.
- **New case study**: build `work/<slug>.html` like Pretzel (root-relative paths), then set `status: "complete"`, `href: "/work/<slug>"`, `preview: { type: "page", src: "/work/<slug>#preview" }`, and add it to `sitemap.xml`.
- **Brands**: `brands.items`. Drop an SVG or transparent PNG in `logos/`; it is recoloured white automatically.
- **Water memories**: `water.places` (grouped by `region`). `last` ("YYYY-MM") sets how often rain falls; outlines live in `shapes.js` under the same name.

## Pretzel page

Built on `tokens.css` (ZT Nature + PP Museum, type ramp, spacing, motion, a11y rules) with Snack's own colour tokens in place of the two accents, on `--bg`. No longer synced from `philmany/pretzel-case-study`; edit it here. `#preview` hides navigation and slowly auto-scrolls for the hover preview. Pause motion shares the site's `localStorage.motion`.

## Versions

Each deploy is tagged `vMM.DD.YYYY` (a second deploy the same day adds `-2`, `-3`).

| Version | Changes |
| --- | --- |
| v11.25.2026 | Snack case study: the problem animation ("one-off buttons" to one component) now sits in a bordered box; messy positions are fitted to the box (rotation included) so nothing bleeds out at any screen size. |
