/*
  SITE CONTENT AND DATA. Edit this file only; no rendering code lives here.
  See README.md for what each field does.
*/
window.SITE_DATA = {
  person: {
    name: "Philman Yeung",
    // {A|B|C} flips through titles; a single {word} is just accented.
    tagline: ["a {Product Manager} & {Designer|Founder|Artist|AI Native|Marketer|GTM Lead} that flows like water."],
  },

  // Shown in the About section. Placeholder until you write a longer introduction.
  // About heading, one string per line.
  introduction: ["Product Manager", "& Designer."],

  /*
    WORK
    status "complete": the row links to `href` and hovering shows a live preview of that page.
    status "placeholder": the row expands in place and says "Case study in progress".
    preview.colors: the two colours used for a placeholder's dot thumbnail.
  */
  work: [
    {
      group: "Product Management",
      items: [
        {
          id: "msads",
          title: "Microsoft Advertising",
          tags: ["Monetization", "Content Safety", "LLM"],
          status: "placeholder",
          summary: "Product Manager for Monetization and Ad Content Safety at Microsoft.",
          preview: { type: "art", colors: ["#2b6cd6", "#5fd3c4"] },
        },
        {
          id: "volta",
          title: "VOLTA Physiotherapy",
          tags: ["Connected Device", "Hardware"],
          status: "placeholder",
          summary: "Co-founded VOLTA Physiotech, a physiotherapy device startup.",
          preview: { type: "art", colors: ["#7b5cff", "#ff8f62"] },
        },
        {
          id: "loreal",
          title: "L’Oréal AR Funnel Optimization",
          tags: ["Augmented Reality", "Ecommerce"],
          status: "placeholder",
          summary: "Digital Product Manager at L’Oréal.",
          preview: { type: "art", colors: ["#e8b25c", "#ff6581"] },
        },
      ],
    },
    {
      group: "Design",
      items: [
        {
          id: "pretzel",
          title: "Pretzel 1.0 Design System",
          tags: ["Design System", "iOS", "Figma"],
          status: "complete",
          href: "pretzel.html",
          preview: { type: "page", src: "pretzel.html#preview" },
        },
        {
          id: "bandit",
          title: "Bandit Labs Redesign",
          tags: ["Product Design", "Dashboard"],
          status: "placeholder",
          summary: "",
          preview: { type: "art", colors: ["#2bd18f", "#ff8a3d"] },
        },
      ],
    },
  ],

  /*
    PLAY: hobbies and fun projects, in the same rows as Work.
    status "complete" with an https href opens that site in a new tab; hovering shows
    preview.src (a screenshot in previews/). "placeholder" rows expand to "Coming soon".
  */
  play: [
    {
      group: "",
      items: [
        {
          id: "pastelprimate",
          title: "Pastel Primate", ai: true,
          tags: ["Art", "Ecommerce"],
          status: "complete",
          href: "https://pastelprimate.com",
          summary: "A lightweight ecommerce site built with my nuBrut Design System. Hosted on Cloudflare, with Stripe, Resend and Cloudflare CAPTCHA integrations.",
          preview: { type: "image", src: "previews/pastelprimate.jpg" },
        },
        {
          id: "eatyourvegetables",
          title: "Eat Your Veggies", ai: true,
          tags: ["Game", "Three.js", "WebRTC"],
          status: "complete",
          href: "https://philmany.github.io/eat-your-vegetables/",
          summary: "A Three.js browser game where players connect directly to each other through PeerJS (WebRTC).",
          preview: { type: "image", src: "previews/eatyourvegetables.jpg" },
        },
        {
          id: "photography",
          title: "Philman Photography",
          tags: ["Portraits"],
          status: "complete",
          href: "https://philmanyeung.mypixieset.com/",
          summary: "Helping people see themselves in a new light.",
          preview: { type: "image", src: "previews/pixieset.jpg" },
        },
        {
          id: "nwhacks",
          title: "nwHacks Brand Identity",
          tags: ["Brand Identity", "Product Design"],
          status: "placeholder",
          summary: "",
          preview: { type: "art", colors: ["#2bd18f", "#2b6cd6"] },
        },
      ],
    },
  ],

  /*
    WATER: the memories in the lake.
    last:     "YYYY-MM" of the most recent visit. More recent = more raindrops there.
    region:   groups the Play list, in the order regions first appear.
    activity: shown as "Last <activity> in <Mon YYYY>".
    at / atNarrow: where the outline sits on the lake, as fractions of the screen
                   (desktop / phone). Layout only, not geography.
    size:     longest side of the outline in px on desktop (phones use 55%).
    label / labelNarrow: show the name card "above" or "below" the outline.
    The outlines themselves live in shapes.js, keyed by name.
  */
  water: {
    title: "Water contains memories.",
    subtitle: "Bodies of water I love, and have memories in.",
    places: [
      { name: "Lake Washington", region: "Pacific Northwest", where: "Washington, USA", activity: "cold-plunged", last: "2025-09",
        at: [0.19, 0.33], atNarrow: [0.17, 0.25], size: 170, label: "above", labelNarrow: "above",
        photo: "memories/lake-washington.jpg", photoSide: "right" },
      { name: "Deep Cove", region: "Pacific Northwest", where: "British Columbia, Canada", activity: "kayaked", last: "2026-08",
        at: [0.5, 0.22], atNarrow: [0.5, 0.18], size: 170, label: "above", labelNarrow: "above",
        photo: "memories/deep-cove.jpg", photoSide: "right", photoSideNarrow: "below" },
      { name: "Garibaldi Lake", region: "Pacific Northwest", where: "British Columbia, Canada", activity: "swam", last: "2026-06",
        at: [0.81, 0.33], atNarrow: [0.83, 0.25], size: 130, label: "above", labelNarrow: "above",
        photo: "memories/garibaldi.jpg", photoSide: "left" },
      { name: "Lachine Canal", region: "Elsewhere", where: "Qu\u00e9bec, Canada", activity: "kayaked", last: "2017-07",
        at: [0.2, 0.68], atNarrow: [0.19, 0.71], size: 190, label: "above", labelNarrow: "above" },
      { name: "Mediterranean Sea", region: "Elsewhere", where: "C\u00f4te d\u2019Azur, France", activity: "skinny-dipped", last: "2025-10",
        at: [0.5, 0.79], atNarrow: [0.5, 0.86], size: 280, label: "above", labelNarrow: "above",
        photo: "memories/mediterranean.jpg", photoSide: "right" },
      { name: "Tai O (\u5927\u6fb3)", region: "Elsewhere", where: "Lantau Island, Hong Kong SAR, China", activity: "out on a fishing boat", last: "2025-12",
        at: [0.8, 0.68], atNarrow: [0.81, 0.71], size: 150, label: "above", labelNarrow: "above",
        photo: "memories/tai-o.jpg", photoSide: "left" },
    ],
  },

  // url: null shows the item as "to add".
  /*
    BRANDS: the scrolling banner above Selected work.
    logo:   path to a white, transparent logo file in logos/. Leave it null to show the name as a wordmark.
    url:    where the logo links (opens in a new tab).
    height: logo height in px on desktop, to balance logos of different shapes (phones use 80%).
  */
  brands: {
    label: "I\u2019ve worked for and with",
    items: [
      { name: "Microsoft", logo: "logos/microsoft.svg", url: "https://www.microsoft.com", height: 26 },
      { name: "L\u2019Or\u00e9al Paris", logo: "logos/loreal-paris.svg", url: "https://www.lorealparis.ca", height: 36 },
      { name: "Yves Saint Laurent", logo: "logos/ysl.svg", url: "https://www.yslbeauty.ca", height: 28 },
      { name: "Armani", logo: "logos/armani.svg", url: "https://www.armani-beauty.ca", height: 26 },
      { name: "Lanc\u00f4me", logo: "logos/lancome.svg", url: "https://www.lancome.ca", height: 36 },
      { name: "Hatch", logo: "logos/hatch.svg", url: "https://hatch.jobs", height: 30 },
      { name: "nwPlus", logo: "logos/nwplus.svg", url: "https://nwplus.io/", height: 48 },
    ],
  },

  links: [
    { label: "Resume", url: "Resume_2027_PhilmanYeung.pdf" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/philmanyeung/" },
    { label: "Email", url: "mailto:philmanyeung@gmail.com", text: "philmanyeung@gmail.com" },
  ],
};
