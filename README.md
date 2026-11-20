# Philman Yeung portfolio

Live at [philmanyeung.com](https://philmanyeung.com). Plain HTML, CSS and JavaScript: no build step, no dependencies.

## Run and deploy

```
cd py-portfolio
npx wrangler pages dev .
```

Use Wrangler, not a plain static server, so clean URLs, `_redirects` and `404.html` behave like production.

Production is the Cloudflare Worker `py-portfolio` (static assets only), deployed from `main`. Settings live in `wrangler.jsonc`; `.assetsignore` keeps repo files like this README off the site. Domain is registered at Porkbun.

- Clean URLs: `about.html` serves at `/about`, `work/pretzel.html` at `/work/pretzel`.
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
| `styles.css` | Look and layout; tokens in `:root`. |
| `fonts/` | Self-hosted WOFF2: ZT Nature (body) and PP Editorial New (headings). |
| `app.js`, `about.js` | Build each page from `data.js`: work list, hover previews, Play list, reveals. |
| `water.js` | The hero lake: 2.5D halftone dots printed as a two-ink riso (teal + orange) with moiré line screens. Palette in `STOPS`. |
| `flow.js` | Page transition: one riso wave washes down the screen and carries on into the next page. |
| `rolodex.js` | Flipping text in the hero tagline and closing heading. |
| `shapes.js` | Water outlines (Natural Earth / GSHHG data or traced from maps; not to scale). |
| `heron.js` | Dot-drawn fish and heron in About: hover the fish and the heron swoops. |
| `sound.js` | Generated wave sound, starts muted. |
| `memories/`, `about/`, `previews/`, `logos/` | Memory snapshots, About portrait, hover previews, brand logos. |
| `work/pretzel.html`, `img/` | Pretzel 1.0 case study, a copy of `philmany/pretzel-case-study`. |
| `Resume_2027_PhilmanYeung.pdf` | Resume, linked from About. |

## Editing `data.js`

- **Booking** (`person.bookingUrl`): the hero's Book a Meeting button (Calendly, new tab). Remove the field to hide the button.
- **Rolodex text** (`person.tagline`, `introduction`): `{A|B|C}` flips through options, `{word}` accents, `{year}` is the current year. Speed is set by `taglineSpeed` / `introductionSpeed` (ms).
- **Work and Play**: `work[].items`, `play[].items`. Outside sites use `href` plus `preview: { type: "image", src: "previews/..." }`.
- **New case study**: build `work/<slug>.html` like Pretzel (root-relative paths), then set `status: "complete"`, `href: "/work/<slug>"`, `preview: { type: "page", src: "/work/<slug>#preview" }`, and add it to `sitemap.xml`.
- **Brands**: `brands.items`. Drop an SVG or transparent PNG in `logos/`; it is recoloured white automatically.
- **Water memories**: `water.places` (grouped by `region`). `last` ("YYYY-MM") sets how often rain falls; outlines live in `shapes.js` under the same name.

## Pretzel page changes

Resynced from `philmany/pretzel-case-study` on request. Local edits: the name link returns to `/#work`, assets use root-relative paths, and `#preview` hides navigation and slowly auto-scrolls for the hover preview. Also keep the no-cut-off fixes on resync: wider `.split .w` reveal windows, and narrow-phone fixes for the Atomic cards, button grid and flywheel labels.
