# Blog

A static blog. You write Markdown files, push to GitHub, and the site rebuilds
itself. Built with [Astro](https://astro.build).

---

## Running it on your machine

You need [Node.js](https://nodejs.org) 20 or newer. Once:

```bash
npm install
```

Then, every time you want to work on it:

```bash
npm run dev
```

Open <http://localhost:4321>. Edits appear instantly — no need to restart.

---

## Writing a post

Make a new file in `src/content/blog/`. The file name is the address:
`ankle-actuator-teardown.md` becomes `/blog/ankle-actuator-teardown`.

```markdown
---
title: "Ankle actuator teardown"
date: 2026-09-20
description: "One sentence shown under the title in the post list."
tags: ["robotics", "hardware"]
draft: false
---

Write the post here in Markdown.
```

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Shown as the heading |
| `date` | yes | `YYYY-MM-DD`; posts are listed newest first |
| `description` | no | Summary in the list and in the RSS feed |
| `tags` | no | Each tag gets its own page at `/tags/<tag>` |
| `draft` | no | `true` = visible locally, never published |

Images: put them in `public/images/` and write `![caption](/images/name.jpg)`.

LaTeX maths works: `$\tau = k_t i$` inline, `$$ ... $$` for display blocks.

---

## Changing how it looks

**Start here — `src/styles/theme.css`.** Every colour, font, size and width on
the site is one variable in that file. Change a value, save, done. There are
three ready-made colour presets at the bottom of the file you can copy over the
defaults.

Common edits:

| I want to… | Change |
|---|---|
| Different colours | `--bg`, `--text`, `--accent`, … in `theme.css` (light block and dark block) |
| Different font | `--font-body` / `--font-heading`; for a Google Font also uncomment the two `<link>` lines in `src/layouts/Base.astro` |
| Wider or narrower text | `--content-width` |
| Bigger text | `--text-size` |
| Sharper corners | `--radius: 0` |

**Layout and structure** live in a few small files:

```
src/site.config.mjs          site title, tagline, nav links, footer links
src/layouts/Base.astro       the page shell — head, header, footer
src/layouts/Post.astro       what an individual post page looks like
src/components/Header.astro  top bar and theme toggle
src/components/Footer.astro  bottom bar
src/components/PostList.astro how posts are listed on the home page
src/pages/index.astro        the home page
src/pages/about.astro        the about page
src/styles/global.css        the actual rules (they read theme.css)
```

To add a page, copy `src/pages/about.astro`, rename it, and add a link to it in
the `nav` list in `src/site.config.mjs`.

Dark mode is automatic (it follows the visitor's system) with a toggle in the
header. To drop dark mode entirely, delete the `:root[data-theme='dark']` block
in `theme.css` and the toggle button in `Header.astro`.

---

## Putting it online

### 1. Push to GitHub

```bash
git init
git add -A
git commit -m "Initial blog"
git branch -M main
git remote add origin https://github.com/YOURNAME/blog.git
git push -u origin main
```

### 2. Turn on GitHub Pages

In the repository: **Settings → Pages → Build and deployment → Source →
GitHub Actions**. The included workflow (`.github/workflows/deploy.yml`) then
builds and publishes on every push to `main`.

### 3. Point your domain at it

1. Set `url` in `src/site.config.mjs` to your domain, e.g. `https://sencan.ch`.
2. In **Settings → Pages → Custom domain**, enter the domain and save. GitHub
   adds a `CNAME` file to the repo for you.
3. At your domain registrar, add these DNS records:

   For an apex domain (`sencan.ch`) — four `A` records:

   ```
   A    @    185.199.108.153
   A    @    185.199.109.153
   A    @    185.199.110.153
   A    @    185.199.111.153
   ```

   For a subdomain (`blog.sencan.ch`) — one record instead:

   ```
   CNAME    blog    YOURNAME.github.io.
   ```

4. Wait for DNS to propagate (minutes to a few hours), then tick
   **Enforce HTTPS** in the Pages settings.

Publishing a new post from then on is: add the `.md` file, `git push`. The site
updates in about a minute.

### Hosting somewhere else instead

Vercel and Netlify both detect Astro automatically — connect the repo, accept
the defaults (`npm run build`, output `dist`), add the domain in their
dashboard. The workflow file is only used by GitHub Pages and can be deleted.
