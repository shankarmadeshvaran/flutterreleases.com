# FlutterReleases

[![Flutter Releases](https://img.shields.io/badge/Flutter-SDK-blue)](https://flutterreleases.com)
[![Dart Releases](https://img.shields.io/badge/Dart-SDK-0175C2)](https://flutterreleases.com)
[![Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org)
[![TailwindCSS](https://img.shields.io/badge/Styled%20with-TailwindCSS-38B2AC)](https://tailwindcss.com)

[FlutterReleases.com](https://flutterreleases.com) is an **unofficial, community-maintained resource** that lists all **Flutter SDK releases** along with corresponding **Dart SDK versions**, release notes, and download links.  

The goal is to provide a **single, consolidated place** to browse Flutter’s **stable, beta, and dev releases**, making it easier for developers to stay up to date.

---

## 🌐 Website

👉 Visit: [https://flutterreleases.com](https://flutterreleases.com)  

Features include:
- A searchable list of all Flutter SDK releases  
- Quick access to release notes and SDK downloads  
- JSON API at `/releases.json`  
- RSS feed at `/feed.xml`  
- SEO-friendly release pages  

---

## 🛠️ Tech Stack

FlutterReleases.com is built with modern web tools:
- **Next.js** (React framework for static site generation)  
- **Tailwind CSS** (utility-first styling, dark mode support)  
- **Node.js scripts** for release data aggregation  
- **Static JSON + RSS + Sitemap** for developer-friendly integration and SEO  

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
- Validate generated data with tools like `jq` (JSON) and `xmllint` (XML).  

---

## 🛡️ Disclaimer

This is **not an official Google or Flutter website**.  
All downloads are hosted by Google, and links on this site take you directly to Flutter’s official resources.  

---

## 📜 License

[MIT](LICENSE)