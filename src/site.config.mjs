// ─────────────────────────────────────────────────────────────────────────────
//  SITE SETTINGS — edit this file first. Nothing here requires code knowledge.
// ─────────────────────────────────────────────────────────────────────────────

export const site = {
  // Your live address. Change this when your domain is ready.
  // No trailing slash. Used for RSS, sitemap and social previews.
  url: 'https://example.com',

  title: "Sencan's RoboBlog",
  tagline: 'Robots and adjacent things of a similar nature',

  // Shown in the footer and in social preview cards.
  author: 'Sencan Weston',
  description: 'Notes on mechanical engineering, robotics and hardware.',

  // Language tag for the <html> element.
  lang: 'en',

  // How dates are printed. 'en-GB' -> 13 September 2026, 'de-CH' -> 13. September 2026
  dateLocale: 'en-GB',
};

// Links in the top navigation bar. Add, remove or reorder freely.
export const nav = [
  { label: 'Posts', href: '/' },
  { label: 'About', href: '/about' },
];

// Links in the footer. Delete any you don't want.
export const social = [
  { label: 'GitHub', href: 'https://github.com/senc-weston' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sencan-weston-80095b222/' },
  { label: 'Email', href: 'westons@ethz.ch' },
  { label: 'RSS', href: '/rss.xml' },
];
