# FlutterReleases

[![Flutter Releases](https://img.shields.io/badge/Flutter-SDK-blue)](https://flutterreleases.com)
[![Dart Releases](https://img.shields.io/badge/Dart-SDK-0175C2)](https://flutterreleases.com)
[![Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org)
[![TailwindCSS](https://img.shields.io/badge/Styled%20with-TailwindCSS-38B2AC)](https://tailwindcss.com)
[![Node 18+](https://img.shields.io/badge/Node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[FlutterReleases.com](https://flutterreleases.com) is an **unofficial, community-maintained resource** that lists all **Flutter SDK releases** along with corresponding **Dart SDK versions**, release notes, and download links.  

The goal is to provide a **single, consolidated place** to browse Flutter’s **stable, beta, and dev releases**, making it easier for developers to stay up to date.

Follow on X: [@devinmaking](https://x.com/devinmaking)

---

## 🌐 Website

👉 Visit: [https://flutterreleases.com](https://flutterreleases.com)

## ✨ Features

- Searchable table of Flutter SDK releases with filters.
- Quick access to release notes (full and per-section for full “Release” items).
- JSON API at `/data/releases.json`.
- RSS feed at `/feed.xml`.
- SEO-friendly static pages and a sitemap at `/sitemap.xml`.

---

## 🛠️ Tech Stack

FlutterReleases.com is built with modern web tools:
- **Next.js** (React framework for static site generation)  
- **Tailwind CSS** (utility-first styling, dark mode support)  
- **Node.js scripts** for release data aggregation  
- **Static JSON + RSS + Sitemap** for developer-friendly integration and SEO  

---

## 🧱 Architecture

- `models/Release.js` — Normalizes raw release items into a consistent shape used by the UI.
- `pages/index.js` — Loads release data from `public/data/releases.json` (preferred) or `public/releases.json` and passes normalized items to the UI via `getStaticProps()`.
- `components/ReleaseTable.js` — Renders the releases table (search, filters, downloads, notes CTAs).
- Releases are currently manually curated in `public/data/releases.json` (the generator is optional and not used in this workflow).
- `feed.xml`, `sitemap.xml` (uses official manifests and GitHub API; prefers curated data when present).

---

## 🚀 Getting Started

Prerequisites:
- Node 18+ (required for global `fetch` in the generator and modern Next.js features)

Install and run:
- `npm ci`
- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run export` — static export (if desired)


## 📜 NPM Scripts

- `dev` — Start Next.js development server
- `build` — Build for production
- `start` — Start production server
- `export` — Export static files (optional)

---

## 🗂️ Project Structure

```
.
├── components/
│   ├── Header.js
│   ├── ReleaseTable.js
│   └── Seo.js
├── models/
│   └── Release.js
├── pages/
│   └── index.js
├── public/
│   ├── data/
│   │   └── releases.json     # curated, preferred
│   ├── releases.json         # generated fallback
│   ├── feed.xml              # generated
│   ├── sitemap.xml           # generated
│   └── ...
├── scripts/
│   └── generate-releases.js
├── styles/
│   └── globals.css (tailwind)
└── README.md
```

---

## 🧭 Coding Standards

- Use ES Modules (ESM) across the repository.
- Use Tailwind CSS for styling; keep classnames descriptive and consistent.
- Ensure data returned from `getStaticProps()` is JSON-serializable (POJOs only). Do not return class instances.
- Keep components simple and presentational; centralize data normalization in `models/Release.js`.

---

## 🤝 Contributing

We welcome contributions from the Flutter community!  
You can help improve [FlutterReleases.com](https://flutterreleases.com) in several ways:

1. **Report issues**  
   - Use [GitHub Issues](../../issues) if you notice missing data, broken links, or incorrect release details.

2. **Improve release data**  
   - Extend or fix the data generation script (`scripts/generate-releases.js`)  
   - Add missing metadata such as Dart versions, engine revisions, or release notes  

3. **Frontend improvements**  
   - Enhance UI components in `components/`  
   - Improve SEO with better metadata in `components/Seo.js`  
   - Add small UX refinements (filters, search, etc.)

4. **Documentation**  
   - Improve this README  
   - Add examples of how to use the JSON API or RSS feed  

### Contribution Guidelines

- Fork the repository and create a branch for your work.  
- Keep pull requests focused (small, single-purpose).  
- Ensure code runs without errors (`npm run build`).  
Validate generated data with tools like `jq` (JSON) and `xmllint` (XML).  

---

## 🛡️ Disclaimer

This is **not an official Google or Flutter website**.  
All downloads are hosted by Google, and links on this site take you directly to Flutter’s official resources.  

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.