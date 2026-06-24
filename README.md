# نتیجه‌ی ارزیابی استرس و تاب‌آوری — نسخه‌ی فارسی (Persian Frontend)

A Persian (RTL) results-viewer for the Stress & Resilience Assessment. It reads a record
from Airtable by `rid` and renders a full report. Built with Vite + React + Tailwind v4.
Deploys free on Vercel; source lives on GitHub.

This is a 1:1 functional clone of the original English Replit frontend, fully translated to
Persian, flipped to right-to-left, and stripped of Replit-specific files and unused dependencies.

---

## How it works

- The visitor opens `https://your-app.vercel.app/?rid=SOME_ID`.
- The browser app (`src/`) calls the serverless function at `api/results/[rid].ts`.
- That function queries Airtable (using your token, base, table) and returns the record.
- The report renders. No build-time secrets are exposed to the browser; the Airtable token
  stays server-side in the Vercel function.

The result link your Make scenario already produces (e.g. `https://stress.sarouei.de/?rid=...`)
works the same way — just point that domain at this Vercel deployment, or use the
`*.vercel.app` URL directly.

---

## Local development (optional)

```bash
npm install
# create a .env from the example and fill in your Airtable values
cp .env.example .env
npm run dev
```

Open http://localhost:5000/?rid=YOUR_RESULT_ID

> Note: the `api/` function runs on Vercel's runtime. Locally you can run it with
> `vercel dev` (install the Vercel CLI) if you want the API to work on your machine.
> Plain `npm run dev` serves the frontend only.

---

## Deploy: GitHub + Vercel (free, automated)

### 1. Put this folder on GitHub
```bash
git init
git add .
git commit -m "Persian stress assessment frontend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Import into Vercel
1. Go to vercel.com → **Add New… → Project**.
2. Pick your GitHub repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output directory `dist` — both auto-filled.
4. Before deploying, open **Environment Variables** and add the three Airtable values
   (see below).
5. Click **Deploy**.

### 3. Set environment variables (in Vercel → Project → Settings → Environment Variables)

| Name | Value |
|------|-------|
| `AIRTABLE_TOKEN` | your Airtable personal access token |
| `AIRTABLE_BASE_ID` | your base id, e.g. `appXXXXXXXXXXXXXX` |
| `AIRTABLE_TABLE` | your table id or name, e.g. `tblXXXXXXXXXXXXXX` |

Add them for **Production** (and Preview if you want). After adding, redeploy once so the
function picks them up.

### 4. Automatic updates
Every `git push` to `main` triggers a new Vercel deploy automatically. No paid plan needed.

### 5. (Optional) custom domain
Vercel → Project → **Domains** → add `stress.sarouei.de` (or any domain you own) and follow
the DNS instructions. Your existing result links keep working.

---

## What to customize

- **Airtable field names:** the API normalizes keys (lowercase, spaces→underscores, strips
  trailing `(...)`), and the report reads keys like `primary_pattern`, `ai_summary`,
  `recharge_score`, etc. These match your Persian blueprint's Airtable output, so no change
  needed unless you rename fields.
- **Pattern labels / fixed UI text:** all in `src/pages/results.tsx` (functions
  `formatPattern`, `patternAnchor`, `defaultKeyInsight`, `startHereText`, `getStressLoop`,
  and the JSX). Edit there to adjust wording.
- **Font:** Vazirmatn is loaded via CDN in `index.html`. Swap the link to change fonts.

---

## File overview

```
api/results/[rid].ts   Serverless function: fetch record from Airtable by rid
src/App.tsx            Reads ?rid= from the URL
src/pages/results.tsx  The full Persian RTL report (all logic + rendering)
src/main.tsx           React entry
src/index.css          Tailwind + Vazirmatn + print styles
index.html             RTL <html dir="rtl" lang="fa">, font link
vercel.json            SPA rewrites (so deep links load index.html, /api passes through)
```
