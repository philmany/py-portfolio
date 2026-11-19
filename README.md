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
| `shapes.js` | Outlines of each body of water: Natural Earth data for the Mediterranean and Lake Washington, hand-traced for the rest (see the note in the file). |
| `heron.js` | The dot-drawn fish and heron in About. Hover the fish and the heron catches it; a new fish swims up 10 seconds later. |
| `sound.js` | The wave sound (generated in the browser, starts muted; speaker button bottom right). |
| `previews/` | Screenshots used as hover previews for sites that can't be embedded (e.g. Pastel Primate). |
| `Resume_2027_PhilmanYeung.pdf` | Your resume, linked from About. |
| `pretzel.html`, `img/` | The Pretzel 1.0 case study, grafted in unchanged except for two things listed below. |

## Updating content (`data.js`)

- **Name and tagline**: `person`. In `tagline`, `{A|B|C}` flips through A, B and C like a rolodex; `taglineSpeed` is how long each stays (ms).
- **Footer**: `footer.text` uses the same `{A|B|C}` rolodex syntax, plus `{year}` for the current year; `footer.speed` sets its pace (ms). The flip itself lives in `rolodex.js`.
- **About**: `introduction`.
- **Links**: `links`. Give Resume a `url`. For Email use `url: "mailto:you@example.com"` and `text: "you@example.com"`.
- **Play**: `play[].items`, same fields as Work. For an outside site, set `href` to its URL and `preview: { type: "image", src: "previews/....jpg" }`.
- **Projects**: `work[].items`. Turn a placeholder into a case study by building its page (copy how `pretzel.html` is set up), then set `status: "complete"`, `href: "your-page.html"` and `preview: { type: "page", src: "your-page.html#preview" }`.
- **Water memories**: `water.places` (grouped in Play by `region`, in list order). `last` ("YYYY-MM") sets how often rain falls there; `at`, `atNarrow`, `size`, `label` only place the outline. Outlines are in `shapes.js`, keyed by the same name.

## Changes made to the Pretzel page

1. The top-left "Philman Yeung" link now goes back to `index.html#work`.
2. A short script at the end adds a preview mode (`pretzel.html#preview`): navigation hidden, slow auto-scroll while the hover preview is showing. Without `#preview` the page behaves exactly as before.

## How the water works

- The lake is tilted in perspective (2.5D). Wind swells roll toward you; a wave equation adds ripples only where your cursor moves.
- The dots carry a woven moiré texture: two fine line screens at slightly different angles, cut into and laid over the dots, drifting slowly.
- Dot size is light (swell, sun on slopes, caustics), scaled again by two moiré gratings that sit just off the dot grid's frequency, so they alias into slow, drifting interference bands.
- Colour runs indigo, cobalt, cerulean, teal, aqua and seafoam with a warm glint, on an aubergine background. The lake is a large rounded shape with a bright shoreline. Change the palette in `STOPS` at the top of `water.js`.
- Outlines are hand-traced and simplified, not survey-accurate or to scale. Motion never changes any data.
- Reduced motion: starts as a still frame with "Play motion". No JavaScript: a static dot pattern.

## Brand banner

`data.js` → `brands.items`. Each brand shows as a wordmark in the site's own type until you add an official
logo file: put it in `logos/` (SVG or transparent PNG) and set `logo: "logos/microsoft.svg"`. Logos are
recoloured to white automatically, sit at low opacity, and brighten on hover while the banner pauses.

## Trial site: GitHub Pages

Live at https://philmany.github.io/py-portfolio/ (deploys from `main`, root folder).
Every push to `main` updates it. To retire it later: repo Settings → Pages → Unpublish site.

## Moving to your own domain: Cloudflare Pages

This is a static site with no build step.

1. Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git** → choose `philmany/py-portfolio`.
2. Build settings: Framework preset **None**, build command **empty**, build output directory **/** (leave root directory empty).
3. Save and deploy. You get `py-portfolio.pages.dev` (or similar). Check it there first.
4. Domain (registered at Porkbun). Pick one:
   - **Bare domain, recommended** (yourdomain.com): Cloudflare must run the domain's DNS.
     a. Cloudflare → Onboard a domain → enter it → Free plan. Check the imported records, especially any email (MX/TXT) records.
     b. Porkbun → domain → **turn off DNSSEC** first, then Nameservers → replace Porkbun's with the two Cloudflare gives you.
        The domain stays registered (and renewed) at Porkbun; only DNS moves.
     c. Once Cloudflare shows the domain Active: Pages project → Custom domains → add `yourdomain.com` and `www.yourdomain.com`.
   - **Subdomain only, keeps DNS at Porkbun** (e.g. www.yourdomain.com): Pages project → Custom domains → add it, then in
     Porkbun add a CNAME `www` → `py-portfolio.pages.dev`. Use Porkbun URL forwarding to send the bare domain to www.
5. Optional: redirect `*.pages.dev` to your domain (Cloudflare Bulk Redirects) so there is one public address.
6. When the domain works, unpublish the GitHub Pages trial.

`pretzel.html` is also served at `/pretzel` on Cloudflare.
