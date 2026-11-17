/*
  SITE CONTENT AND DATA. Edit this file only; no rendering code lives here.
  See README.md for what each field does.
*/
window.SITE_DATA = {
  person: {
    name: "Philman Yeung",
    tagline: "a product manager and designer that nurtures ideas and people",
  },

  // Shown in the About section. Placeholder until you write a longer introduction.
  introduction: "Product Manager and Designer.",

  /*
    WORK
    status "complete": the row links to `href` and hovering shows a live preview of that page.
    status "placeholder": the row expands in place and says "Case study in progress".
    preview.colors: the two colours used for a placeholder's dot thumbnail.
  */
  work: [
    {
      group: "Product management",
      items: [
        {
          id: "volta",
          title: "VOLTA Physiotherapy Device",
          tags: ["Connected Device", "Hardware"],
          status: "placeholder",
          summary: "Co-founded VOLTA Physiotech, a physiotherapy device startup.",
          preview: { type: "art", colors: ["#7b5cff", "#ff8f62"] },
        },
        {
          id: "loreal",
          title: "L’Oréal Funnel Optimization",
          tags: ["Ecommerce", "Data"],
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
          id: "nwhacks",
          title: "nwHacks Brand Identity",
          tags: ["Brand Identity", "Hackathon"],
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
        at: [0.09, 0.66], atNarrow: [0.15, 0.72], size: 200, label: "below", labelNarrow: "below" },
      { name: "Deep Cove", region: "Pacific Northwest", where: "British Columbia, Canada", activity: "kayaked", last: "2026-08",
        at: [0.17, 0.27], atNarrow: [0.16, 0.2], size: 150, label: "below", labelNarrow: "below" },
      { name: "Deer Lake", region: "Pacific Northwest", where: "British Columbia, Canada", activity: "kayaked", last: "2025-09",
        at: [0.32, 0.83], atNarrow: [0.62, 0.33], size: 150, label: "above", labelNarrow: "below" },
      { name: "Lachine Canal", region: "Elsewhere", where: "Qu\u00e9bec, Canada", activity: "kayaked", last: "2017-07",
        at: [0.81, 0.24], atNarrow: [0.7, 0.15], size: 200, label: "below", labelNarrow: "below" },
      { name: "Mediterranean Sea", region: "Elsewhere", where: "C\u00f4te d\u2019Azur, France", activity: "skinny-dipped", last: "2025-10",
        at: [0.82, 0.57], atNarrow: [0.62, 0.7], size: 290, label: "below", labelNarrow: "above" },
      { name: "Tai O (\u5927\u6fb3)", region: "Elsewhere", where: "Lantau Island, Hong Kong SAR, China", activity: "out on a fishing boat", last: "2025-12",
        at: [0.63, 0.82], atNarrow: [0.52, 0.86], size: 140, label: "above", labelNarrow: "above" },
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
    label: "Brands I\u2019ve worked for and with",
    items: [
      { name: "Microsoft", logo: "logos/microsoft.svg", url: "https://www.microsoft.com", height: 26 },
      { name: "L\u2019Or\u00e9al Paris", logo: "logos/loreal-paris.svg", url: "https://www.lorealparis.ca", height: 36 },
      { name: "Yves Saint Laurent", logo: "logos/ysl.svg", url: "https://www.yslbeauty.ca", height: 28 },
      { name: "Armani", logo: "logos/armani.svg", url: "https://www.armani-beauty.ca", height: 26 },
      { name: "Lanc\u00f4me", logo: "logos/lancome.svg", url: "https://www.lancome.ca", height: 36 },
    ],
  },

  links: [
    { label: "Resume", url: "Resume_2027_PhilmanYeung.pdf" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/philmanyeung/" },
    { label: "Email", url: "mailto:philmanyeung@gmail.com", text: "philmanyeung@gmail.com" },
  ],
};
